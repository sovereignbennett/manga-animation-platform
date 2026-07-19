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
  ctx.drawImage(
    img,
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/png");
}

/**
 * Non-destructive lasso cut. Keeps pixels inside `path` (in mask-local pixel
 * coords), makes everything outside transparent. Returns a new PNG data URL
 * with the same dimensions as the source image so the layer's width/height,
 * anchor and transform stay valid.
 */
export async function cutToPolygon(
  src: string,
  path: Array<{ x: number; y: number }>,
): Promise<string> {
  if (path.length < 3) return src;
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.beginPath();
  path.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();
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
 Apply a brush/eraser stroke to a bitmap. Returns a new PNG data URL.
 * @param src   current image (RGBA PNG data URL)
 * @param mode  "paint" draws with `color` at `opacity`; "erase" removes pixels at `opacity`.
 * @param path  stroke points in **source-local pixel** coords
 * @param brushSize radius in pixels
 * @param opts  optional color/opacity for the stroke
 */
export async function applyBrushStroke(
  src: string,
  mode: "paint" | "erase",
  path: Array<{ x: number; y: number }>,
  brushSize: number,
  opts?: { color?: string; opacity?: number },
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
  ctx.globalAlpha = Math.max(0, Math.min(1, opts?.opacity ?? 1));

  if (mode === "erase") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = opts?.color ?? "#ffffff";
  }

  ctx.beginPath();
  path.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
