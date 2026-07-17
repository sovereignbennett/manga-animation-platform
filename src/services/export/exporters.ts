// gifenc ships CJS — namespace import works across Vite SSR and browser.
import * as gifencNs from "gifenc";
const gifenc = (gifencNs as unknown as { default?: typeof gifencNs }).default ?? gifencNs;
const { GIFEncoder, quantize, applyPalette } = gifenc;
// Destructure the functions from the namespace
import { renderFrame } from "./exportBridge";
export type ExportProgress = (info: { stage: string; progress: number }) => void;

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export interface FrameRangeOpts {
  from: number;
  to: number;
  step?: number;
  width: number;
  height: number;
  transparent?: boolean;
  onProgress?: ExportProgress;
}

/** Single-frame PNG (optionally transparent). */
export async function exportPNG(opts: {
  frame: number;
  width: number;
  height: number;
  transparent?: boolean;
  filename?: string;
}) {
  const canvas = await renderFrame(opts.frame, {
    transparent: opts.transparent,
    width: opts.width,
    height: opts.height,
  });
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG encode failed"))), "image/png"),
  );
  downloadBlob(blob, opts.filename ?? `motioncut-frame-${opts.frame}.png`);
}

/** MP4 (or WebM fallback) via MediaRecorder over an offscreen canvas. */
export async function exportVideo(opts: FrameRangeOpts & { fps: number; filename?: string }) {
  const { from, to, fps, width, height, onProgress } = opts;
  const step = opts.step ?? 1;
  const stage = document.createElement("canvas");
  stage.width = width;
  stage.height = height;
  const ctx = stage.getContext("2d")!;

  const stream = stage.captureStream(fps);
  const mimeCandidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const done = new Promise<Blob>((res) => (recorder.onstop = () => res(new Blob(chunks, { type: mime }))));
  recorder.start(100);

  const frameDurMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.floor((to - from) / step) + 1);
  let i = 0;
  for (let f = from; f <= to; f += step, i++) {
    const canvas = await renderFrame(f, { width, height });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    onProgress?.({ stage: "Recording", progress: (i + 1) / totalFrames });
    await new Promise((r) => setTimeout(r, frameDurMs));
  }
  // Let the last frame flush
  await new Promise((r) => setTimeout(r, 200));
  recorder.stop();
  const blob = await done;
  downloadBlob(blob, `${opts.filename ?? "motioncut"}.${ext}`);
  return { mime, ext };
}

/** GIF via gifenc — pure JS, no worker needed. */
export async function exportGIF(opts: FrameRangeOpts & { fps: number; filename?: string; loop?: number }) {
  const { from, to, fps, width, height, onProgress } = opts;
  const step = opts.step ?? 1;
  const gif = GIFEncoder();
  const delay = Math.max(20, Math.round(1000 / fps));
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d", { willReadFrequently: true })!;

  const totalFrames = Math.max(1, Math.floor((to - from) / step) + 1);
  let i = 0;
  for (let f = from; f <= to; f += step, i++) {
    const canvas = await renderFrame(f, { width, height });
    octx.clearRect(0, 0, width, height);
    octx.drawImage(canvas, 0, 0, width, height);
    const data = octx.getImageData(0, 0, width, height).data;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay, transparent: true });
    onProgress?.({ stage: "Encoding GIF", progress: (i + 1) / totalFrames });
    // Yield so UI can breathe
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();
  const bytes = gif.bytesView();
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: "image/gif" });
  downloadBlob(blob, `${opts.filename ?? "motioncut"}.gif`);
}

/** Sprite sheet — grid of frames on a single PNG. */
export async function exportSpriteSheet(opts: FrameRangeOpts & {
  columns?: number;
  filename?: string;
}) {
  const { from, to, width, height, onProgress } = opts;
  const step = opts.step ?? 1;
  const totalFrames = Math.max(1, Math.floor((to - from) / step) + 1);
  const columns = opts.columns ?? Math.min(totalFrames, Math.ceil(Math.sqrt(totalFrames * (height / width))));
  const rows = Math.ceil(totalFrames / columns);
  const sheet = document.createElement("canvas");
  sheet.width = width * columns;
  sheet.height = height * rows;
  const sctx = sheet.getContext("2d")!;

  let i = 0;
  for (let f = from; f <= to; f += step, i++) {
    const canvas = await renderFrame(f, { width, height, transparent: opts.transparent });
    const col = i % columns;
    const row = Math.floor(i / columns);
    sctx.drawImage(canvas, col * width, row * height, width, height);
    onProgress?.({ stage: "Composing sheet", progress: (i + 1) / totalFrames });
  }

  const blob = await new Promise<Blob>((res, rej) =>
    sheet.toBlob((b) => (b ? res(b) : rej(new Error("PNG encode failed"))), "image/png"),
  );
  downloadBlob(blob, `${opts.filename ?? "motioncut"}-sheet-${columns}x${rows}.png`);

  // Also emit a small JSON metadata file
  const meta = {
    frameWidth: width,
    frameHeight: height,
    columns,
    rows,
    frameCount: totalFrames,
    frameDurationMs: 1000 / 30,
  };
  downloadBlob(new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), `${opts.filename ?? "motioncut"}-sheet.json`);
}
