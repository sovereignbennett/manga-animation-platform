/**
 * useMagicCut — orchestrates the Hybrid segmentation pipeline and
 * applies the result to the editor store.
 *
 * The hook is the ONLY place the UI touches segmentation. Providers,
 * mask ops and rigging heuristics stay behind their service modules.
 */

import { useCallback, useState } from "react";
import { segmentHybrid } from "@/services/segmentation";
import { extractPartFromForeground } from "@/services/masking/maskOps";
import { suggestPivot, pivotToAnchor } from "@/services/rigging/pivotSuggester";
import { BODY_PART_LABELS, type SegmentationResult } from "@/types/segmentation";
import { useEditor } from "@/store/editorStore";

export type MagicCutStage = "idle" | "running" | "done" | "error";

export interface MagicCutState {
  stage: MagicCutStage;
  progress: number;
  message: string;
  error?: string;
  result?: SegmentationResult;
}

export function useMagicCut() {
  const [state, setState] = useState<MagicCutState>({ stage: "idle", progress: 0, message: "" });
  const applyMagicCut = useEditor((s) => s.applyMagicCut);

  const run = useCallback(async (layerId: string) => {
    const layer = useEditor.getState().project.layers.find((l) => l.id === layerId);
    if (!layer?.src) {
      setState({ stage: "error", progress: 0, message: "", error: "Select an image layer first" });
      return;
    }

    setState({ stage: "running", progress: 0, message: "Starting" });
    const controller = new AbortController();

    try {
      const result = await segmentHybrid(layer.src, {
        signal: controller.signal,
        onProgress: (p, msg) => setState((s) => ({ ...s, progress: p, message: msg })),
      });

      if (!result.foreground) throw new Error("Foreground extraction failed");

      // Extract per-part cutouts from the foreground image.
      const cutouts = await Promise.all(
        result.parts.map(async (part) => {
          const { src: cutSrc, bounds } = await extractPartFromForeground(result.foreground!, part.bbox);
          const pivotAbs = part.suggestedPivot ?? suggestPivot(part.kind, part.bbox);
          const { anchorX, anchorY } = pivotToAnchor(pivotAbs, bounds);
          return {
            partId: part.id,
            src: cutSrc,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            anchorX,
            anchorY,
            bodyPart: part.kind,
            label: part.label || BODY_PART_LABELS[part.kind],
            confidence: part.confidence,
            pivot: { x: pivotAbs.x - bounds.x, y: pivotAbs.y - bounds.y },
          };
        }),
      );

      // If the AI returned zero parts, fall back to a single foreground layer
      // so the user still gets a clean cutout — better than nothing.
      if (cutouts.length === 0 && result.foreground) {
        const fg = result.foreground;
        const { src: cutSrc, bounds } = await extractPartFromForeground(fg, fg.bounds);
        cutouts.push({
          partId: "foreground",
          src: cutSrc,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          anchorX: 0.5,
          anchorY: 0.5,
          bodyPart: "foreground",
          label: "Foreground",
          confidence: 1,
          pivot: { x: bounds.width / 2, y: bounds.height / 2 },
        });
      }

      applyMagicCut(layerId, result, cutouts);
      setState({ stage: "done", progress: 1, message: `Cut into ${cutouts.length} parts`, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ stage: "error", progress: 0, message: "", error: msg });
    }

    return () => controller.abort();
  }, [applyMagicCut]);

  const reset = useCallback(() => setState({ stage: "idle", progress: 0, message: "" }), []);

  return { state, run, reset };
}
