import type { BBox, Mask } from "@/types/segmentation";

export interface ExtractedCutout {
  src: string;
  bounds: BBox;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for mask extraction"));
    image.src = src;
  });
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable");
  return { canvas, context };
}

export function clampBounds(bounds: BBox, maxWidth: number, maxHeight: number): BBox {
  const x = Math.max(0, Math.floor(bounds.x));
  const y = Math.max(0, Math.floor(bounds.y));
  const right = Math.min(maxWidth, Math.ceil(bounds.x + bounds.width));
  const bottom = Math.min(maxHeight, Math.ceil(bounds.y + bounds.height));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export async function extractPartFromForeground(
  foreground: Mask,
  bounds: BBox,
): Promise<ExtractedCutout> {
  const image = await loadImage(foreground.data);
  const crop = clampBounds(
    bounds,
    image.naturalWidth || foreground.width,
    image.naturalHeight || foreground.height,
  );
  const { canvas, context } = createCanvas(crop.width, crop.height);

  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return {
    src: canvas.toDataURL("image/png"),
    bounds: crop,
  };
}
