import type { Clip, TimeRange } from "@/types";

/** Pure geometry helpers shared by UI and services. */
export const TrackMath = {
  timeToPx(time: number, zoom: number): number { return time * zoom; },
  pxToTime(px: number, zoom: number): number { return px / zoom; },
  rangeWidth(range: TimeRange, zoom: number): number {
    return Math.max(1, (range.end - range.start) * zoom);
  },
  overlaps(a: TimeRange, b: TimeRange): boolean {
    return a.start < b.end && b.start < a.end;
  },
  clipEdges(clips: readonly Clip[]): number[] {
    const out: number[] = [];
    for (const c of clips) { out.push(c.range.start, c.range.end); }
    return out;
  },
  moveClip(clip: Clip, deltaSeconds: number, minTime = 0): Clip {
    const len = clip.range.end - clip.range.start;
    const start = Math.max(minTime, clip.range.start + deltaSeconds);
    return { ...clip, range: { start, end: start + len } };
  },
  trimClip(clip: Clip, edge: "start" | "end", newTime: number, minLen = 0.05): Clip {
    if (edge === "start") {
      const start = Math.min(clip.range.end - minLen, Math.max(0, newTime));
      const delta = start - clip.range.start;
      return { ...clip, range: { ...clip.range, start }, sourceOffset: Math.max(0, clip.sourceOffset + delta) };
    }
    const end = Math.max(clip.range.start + minLen, newTime);
    return { ...clip, range: { ...clip.range, end } };
  },
};
