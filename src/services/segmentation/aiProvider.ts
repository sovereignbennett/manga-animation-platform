/**
 * MotionCut Server body-part detection provider.
 *
 * The frontend only talks to MotionCut APIs. Provider keys and model
 * implementation details live on the backend.
 */

import { apiClient } from "@/services/api/client";
import type {
  SegmentationProvider,
  SegmentationOptions,
  SegmentationResult,
  SegmentedPart,
} from "@/types/segmentation";

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
    id: "motioncut-ai",
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
    const res = await apiClient.request<Omit<SegmentationResult, "foreground">>("/api/v1/ai/body-parts/detect", {
      method: "POST",
      signal: opts.signal,
      body: {
        imageDataUrl: imageSrc,
        imageWidth: w,
        imageHeight: h,
        restrictTo: opts.restrictTo ?? [],
        options: {
          includeMasks: false,
          confidenceThreshold: 0.35,
        },
      },
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
