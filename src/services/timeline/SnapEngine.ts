/**
 * Snapping math. Pure. Given a candidate time (seconds) and a set of
 * snap points, returns the snapped time and the matched point (if any).
 */
export interface SnapPoint { time: number; label?: string }

export interface SnapResult {
  time: number;
  snapped: boolean;
  matched?: SnapPoint;
}

export const SnapEngine = {
  /**
   * @param candidate time in seconds
   * @param points snap candidates
   * @param toleranceSeconds max distance to snap
   */
  snap(candidate: number, points: readonly SnapPoint[], toleranceSeconds: number): SnapResult {
    let best: SnapPoint | undefined;
    let bestDist = toleranceSeconds;
    for (const p of points) {
      const d = Math.abs(p.time - candidate);
      if (d <= bestDist) { best = p; bestDist = d; }
    }
    if (best) return { time: best.time, snapped: true, matched: best };
    return { time: candidate, snapped: false };
  },

  /** Build snap points from clip edges, playhead and markers. */
  gather(input: {
    playhead?: number;
    clipEdges?: readonly number[];
    markers?: readonly { time: number; label?: string }[];
    grid?: { step: number; count: number };
  }): SnapPoint[] {
    const out: SnapPoint[] = [];
    if (input.playhead != null) out.push({ time: input.playhead, label: "playhead" });
    for (const t of input.clipEdges ?? []) out.push({ time: t, label: "clip" });
    for (const m of input.markers ?? []) out.push({ time: m.time, label: m.label ?? "marker" });
    if (input.grid) {
      for (let i = 0; i <= input.grid.count; i++) out.push({ time: i * input.grid.step, label: "grid" });
    }
    return out;
  },
};
