import { easingByName } from "@/utils/easing";
import { lerp } from "@/utils/math";
import type { AnimationTrack, Keyframe } from "./AnimationTypes";

const findSegment = <T>(kfs: Keyframe<T>[], t: number): [Keyframe<T>, Keyframe<T>] | null => {
  if (kfs.length === 0) return null;
  if (t <= kfs[0].time) return [kfs[0], kfs[0]];
  if (t >= kfs[kfs.length - 1].time) { const k = kfs[kfs.length - 1]; return [k, k]; }
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].time && t <= kfs[i + 1].time) return [kfs[i], kfs[i + 1]];
  }
  return null;
};

export const Interpolator = {
  numberAt(track: AnimationTrack<number>, t: number): number {
    const seg = findSegment(track.keyframes, t);
    if (!seg) return 0;
    const [a, b] = seg;
    if (a === b) return a.value;
    const local = (t - a.time) / (b.time - a.time);
    return lerp(a.value, b.value, easingByName(a.easing)(local));
  },
};
