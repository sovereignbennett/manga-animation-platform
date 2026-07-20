import type { BrushPreset } from "./BrushTypes";

const defaults = {
  size: 24, opacity: 1, hardness: 0.8, spacing: 0.15,
  smoothing: 0.4, color: "#ffffff",
  pressureSize: true, pressureOpacity: false,
};

export const BUILTIN_BRUSH_PRESETS: readonly BrushPreset[] = [
  { id: "hard-round",  name: "Hard Round",  tool: "brush",  params: { ...defaults, hardness: 1, size: 16 } },
  { id: "soft-round",  name: "Soft Round",  tool: "brush",  params: { ...defaults, hardness: 0.2, size: 48, opacity: 0.7 } },
  { id: "ink-pen",     name: "Ink Pen",     tool: "pen",    params: { ...defaults, hardness: 1, size: 4,  smoothing: 0.7 } },
  { id: "marker",      name: "Marker",      tool: "brush",  params: { ...defaults, hardness: 0.6, size: 40, opacity: 0.85 } },
  { id: "eraser",      name: "Eraser",      tool: "eraser", params: { ...defaults, size: 32, hardness: 0.9 } },
  { id: "lasso",       name: "Lasso",       tool: "lasso",  params: { ...defaults, size: 1, hardness: 1, smoothing: 0 } },
];
