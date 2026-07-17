/**
 * Pure raster mask operations. No React, no Zustand, no Pixi — safe to
 * unit test and to run inside a Web Worker later.
 *
 * TODO(perf): move to OffscreenCanvas + Worker for large images.
 */

import type { BBox, Mask } from "@/types/segmentation";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop a mask (or any image) to `bbox` and return a data URL sized exactly
 * to that bbox. Useful for turning a full-canvas cutout into a compact
 * layer bitmap.
 */
export async function cropToBounds(src: string, bbox: BBox): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bbox.width));
  canvas.height = Math.max(1, Math.round(bbox.height));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/**
 * Intersect a full-image mask (RGBA cutout of the whole subject) with a
 * body-part bbox. Returns a cropped PNG containing only the part's pixels,
 * preserving transparency.
 */
export async function extractPartFromForeground(
  foreground: Mask,
  bbox: BBox,
): Promise<{ src: string; bounds: BBox }> {
  // Clamp bbox to image bounds
  const x = Math.max(0, Math.floor(bbox.x));
  const y = Math.max(0, Math.floor(bbox.y));
  const w = Math.min(foreground.width - x, Math.ceil(bbox.width));
  const h = Math.min(foreground.height - y, Math.ceil(bbox.height));
  const safeBounds: BBox = { x, y, width: w, height: h };
  const src = await cropToBounds(foreground.data, safeBounds);
  return { src, bounds: safeBounds };
}

/**
 * Apply a brush/eraser stroke to a mask image. Returns a new data URL.
 * @param src   current mask (RGBA PNG data URL)
 * @param mode  "paint" adds to the mask, "erase" removes from it
 * @param path  stroke points in **mask-local pixel** coords
 * @param brushSize radius in pixels
 */
export async function applyBrushStroke(
  src: string,
  mode: "paint" | "erase",
  path: Array<{ x: number; y: number }>,
  brushSize: number,
  sourceImage?: string, // when painting, we sample color from here
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  ctx.lineWidth = brushSize * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (mode === "erase") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    // Paint: reveal source pixels through the stroke. If a source image is
    // supplied we clip the stroke to the source; otherwise fill solid white.
    ctx.globalCompositeOperation = "source-over";
    if (sourceImage) {
      const srcImg = await loadImage(sourceImage);
      const pattern = ctx.createPattern(srcImg, "no-repeat");
      if (pattern) ctx.strokeStyle = pattern;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,1)";
    }
  }

  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
