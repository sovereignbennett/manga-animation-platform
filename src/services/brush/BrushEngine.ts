import { uid } from "@/utils/id";
import { StrokeBuffer } from "./StrokeBuffer";
import type { BrushParams, BrushTool, Stroke, StrokePoint } from "./BrushTypes";

/**
 * Stateful brush session. Pure logic — receives pointer samples and
 * produces stroke geometry. The renderer decides how to draw them.
 */
export class BrushEngine {
  private tool: BrushTool = "brush";
  private params: BrushParams;
  private buffer: StrokeBuffer;
  private active = false;
  private currentId: string | null = null;

  constructor(params: BrushParams) {
    this.params = params;
    this.buffer = new StrokeBuffer(params.smoothing);
  }

  setTool(tool: BrushTool): void { this.tool = tool; }
  setParams(params: BrushParams): void {
    this.params = params;
    this.buffer = new StrokeBuffer(params.smoothing);
  }

  begin(p: StrokePoint): string {
    this.active = true;
    this.buffer.clear();
    this.buffer.push(p);
    this.currentId = uid("stroke");
    return this.currentId;
  }
  move(p: StrokePoint): StrokePoint[] {
    if (!this.active) return [];
    this.buffer.push(p);
    return this.buffer.sample(Math.max(1, this.params.size * this.params.spacing));
  }
  end(): Stroke | null {
    if (!this.active || !this.currentId) return null;
    const stroke: Stroke = {
      id: this.currentId,
      tool: this.tool,
      params: this.params,
      points: this.buffer.sample(Math.max(1, this.params.size * this.params.spacing)),
    };
    this.active = false;
    this.currentId = null;
    return stroke;
  }
  cancel(): void { this.active = false; this.currentId = null; this.buffer.clear(); }
  isActive(): boolean { return this.active; }
}
