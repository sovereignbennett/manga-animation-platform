/**
 * Bridge between the CanvasStage (which owns the Pixi renderer) and the
 * export services. The stage registers a `renderFrame` function on mount;
 * exporters call it to produce an HTMLCanvasElement for any given frame.
 */

export interface RenderFrameOptions {
  transparent?: boolean;
  width?: number;
  height?: number;
}

type RenderFn = (frame: number, opts?: RenderFrameOptions) => Promise<HTMLCanvasElement>;

let renderFn: RenderFn | null = null;

export function registerFrameRenderer(fn: RenderFn) {
  renderFn = fn;
  return () => { if (renderFn === fn) renderFn = null; };
}

export async function renderFrame(frame: number, opts?: RenderFrameOptions): Promise<HTMLCanvasElement> {
  if (!renderFn) throw new Error("Canvas not ready yet — open the editor first.");
  return renderFn(frame, opts);
}

export function isRendererReady() { return renderFn !== null; }
