/**
 * Client-side background removal via @imgly/background-removal (WASM).
 * Runs entirely in the browser — no server round trip, no credit cost.
 * First run downloads the model (~20MB) and caches it in the browser.
 */

import type {
  SegmentationProvider,
  SegmentationOptions,
  SegmentationResult,
  Mask,
} from "@/types/segmentation";

type RemoveBgFn = (src: string | Blob, cfg?: Record<string, unknown>) => Promise<Blob>;
let removeBgFn: RemoveBgFn | null = null;

async function loadLib(): Promise<RemoveBgFn> {
  if (removeBgFn) return removeBgFn;
  const mod = await import("@imgly/background-removal");
  removeBgFn = mod.removeBackground as unknown as RemoveBgFn;
  return removeBgFn;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Compute tight bounds of non-transparent pixels. */
function computeAlphaBounds(imageData: ImageData) {
  const { width, height, data } = imageData;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width, height };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export const imglyProvider: SegmentationProvider = {
  capabilities: {
    id: "imgly",
    displayName: "In-browser (imgly)",
    clientSide: true,
    producesPartMasks: false,
    costTier: "free",
  },
  async segment(imageSrc, opts: SegmentationOptions = {}): Promise<SegmentationResult> {
    const t0 = performance.now();
    opts.onProgress?.(0.05, "Loading model");
    const remove = await loadLib();
    if (opts.signal?.aborted) throw new Error("aborted");

    opts.onProgress?.(0.2, "Removing background");
    const outBlob = await remove(imageSrc, {
      progress: (_key: string, current: number, total: number) => {
        if (total > 0) opts.onProgress?.(0.2 + (current / total) * 0.7, "Removing background");
      },
    });

    opts.onProgress?.(0.92, "Computing bounds");
    const dataUrl = await blobToDataUrl(outBlob);
    const img = await loadImage(dataUrl);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const bounds = computeAlphaBounds(ctx.getImageData(0, 0, img.width, img.height));

    const mask: Mask = { data: dataUrl, bounds, width: img.width, height: img.height };
    opts.onProgress?.(1, "Done");

    return {
      sourceWidth: img.width,
      sourceHeight: img.height,
      provider: "imgly",
      foreground: mask,
      parts: [],
      modelTag: "imgly@1.7",
      durationMs: performance.now() - t0,
    };
  },
};
