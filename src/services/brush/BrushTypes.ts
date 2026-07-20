export type BrushTool = "brush" | "eraser" | "pen" | "lasso";

export interface BrushParams {
  size: number;
  opacity: number;    // 0..1
  hardness: number;   // 0..1
  spacing: number;    // fraction of size (0.05..2)
  smoothing: number;  // 0..1
  color: string;      // hex
  pressureSize: boolean;
  pressureOpacity: boolean;
}

export interface BrushPreset {
  id: string;
  name: string;
  tool: BrushTool;
  params: BrushParams;
}

export interface StrokePoint {
  x: number; y: number;
  pressure: number;   // 0..1
  t: number;          // ms
}

export interface Stroke {
  id: string;
  tool: BrushTool;
  params: BrushParams;
  points: StrokePoint[];
}
