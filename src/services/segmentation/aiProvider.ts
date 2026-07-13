/**
 * AI-Gateway body-part detection provider.
 *
 * The heavy lifting (vision model call) lives in the server function
 * `detectBodyParts` (src/lib/segmentation.functions.ts). This provider is
 * the thin client-side adapter that shapes the response into our
 * SegmentationResult contract.
 *
 * TODO(future): swap the vision-model bbox response for a true per-pixel
 * segmentation model (e.g. SAM, YOLOv8-seg). The `SegmentationProvider`
 * interface already supports `mask` on each part — populate it there.
 */

import type {
  SegmentationProvider,
  SegmentationOptions,
  SegmentationResult,
  SegmentedPart,
} from "@/types/segmentation";
import { detectBodyParts } from "@/lib/segmentation.functions";

async function loadImageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

export const aiProvider: SegmentationProvider = {
  capabilities: {
    id: "ai-gateway",
    displayName: "AI Body-Part Detection",
    clientSide: false,
    producesPartMasks: false, // bboxes only, for now
    costTier: "cheap",
  },
  async segment(imageSrc, opts: SegmentationOptions = {}): Promise<SegmentationResult> {
    const t0 = performance.now();
    opts.onProgress?.(0.1, "Uploading to AI");

    const { w, h } = await loadImageDims(imageSrc);
    if (opts.signal?.aborted) throw new Error("aborted");

    opts.onProgress?.(0.35, "Analyzing character");
    const res = await detectBodyParts({
      data: { imageDataUrl: imageSrc, imageWidth: w, imageHeight: h },
    });
    if (opts.signal?.aborted) throw new Error("aborted");

    opts.onProgress?.(0.9, "Composing parts");
    const parts: SegmentedPart[] = res.parts.map((p, i: number) => ({
      id: `part_${Date.now().toString(36)}_${i}`,
      kind: p.kind,
      label: p.label,
      confidence: p.confidence,
      bbox: p.bbox,
      suggestedPivot: p.suggestedPivot,
    }));

    opts.onProgress?.(1, "Done");
    return {
      sourceWidth: w,
      sourceHeight: h,
      provider: "ai-gateway",
      parts,
      modelTag: res.modelTag,
      durationMs: performance.now() - t0,
    };
  },
};
