import type { StrokePoint } from "./BrushTypes";

/** Rolling buffer used while a stroke is being drawn. Framework-free. */
export class StrokeBuffer {
  private points: StrokePoint[] = [];
  private smoothing: number;

  constructor(smoothing = 0) { this.smoothing = smoothing; }

  clear(): void { this.points = []; }
  size(): number { return this.points.length; }
  raw(): readonly StrokePoint[] { return this.points; }

  push(p: StrokePoint): void {
    if (this.smoothing > 0 && this.points.length > 0) {
      const prev = this.points[this.points.length - 1];
      const k = 1 - this.smoothing;
      this.points.push({
        x: prev.x + (p.x - prev.x) * k,
        y: prev.y + (p.y - prev.y) * k,
        pressure: prev.pressure + (p.pressure - prev.pressure) * k,
        t: p.t,
      });
    } else {
      this.points.push(p);
    }
  }

  /**
   * Return spaced samples along the buffered path. `spacingPx` controls
   * how densely samples are emitted (relative to brush size).
   */
  sample(spacingPx: number): StrokePoint[] {
    if (this.points.length < 2) return [...this.points];
    const out: StrokePoint[] = [this.points[0]];
    let acc = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = out[out.length - 1];
      const b = this.points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      acc += d;
      while (acc >= spacingPx) {
        const t = (d - (acc - spacingPx)) / d;
        out.push({
          x: a.x + dx * t, y: a.y + dy * t,
          pressure: a.pressure + (b.pressure - a.pressure) * t,
          t: a.t + (b.t - a.t) * t,
        });
        acc -= spacingPx;
      }
    }
    return out;
  }
}
