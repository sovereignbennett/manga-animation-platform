/**
 * Keyframe sampling. Pure, deterministic and cheap: called every frame
 * by the render loop for every animated property, so keep it allocation-free.
 */

import type { AnimatableProp, Keyframe, Keyframes } from "@/types/animation";
import { ease } from "./easing";

/**
 * Return the interpolated value of `prop` at `frame`, or `fallback` when
 * the property has no keyframes. Keyframes must be sorted by frame.
 */
export function sampleProp(
  kfs: Keyframes,
  prop: AnimatableProp,
  frame: number,
  fallback: number,
): number {
  const arr = kfs[prop];
  if (!arr || arr.length === 0) return fallback;
  if (arr.length === 1) return arr[0].value;
  if (frame <= arr[0].frame) return arr[0].value;
  const last = arr[arr.length - 1];
  if (frame >= last.frame) return last.value;

  // Binary search for the segment [a, b] containing frame.
  let lo = 0;
  let hi = arr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].frame <= frame) lo = mid;
    else hi = mid;
  }
  const a = arr[lo];
  const b = arr[hi];
  const span = b.frame - a.frame || 1;
  const t = (frame - a.frame) / span;
  const eased = ease(a.easing, t);
  return a.value + (b.value - a.value) * eased;
}

/** Sorted insert (or replace) a keyframe at `frame`. Returns a new array. */
export function upsertKeyframe(list: Keyframe[] | undefined, kf: Keyframe): Keyframe[] {
  const arr = list ? [...list] : [];
  const idx = arr.findIndex((k) => k.frame === kf.frame);
  if (idx >= 0) arr[idx] = kf;
  else arr.push(kf);
  arr.sort((a, b) => a.frame - b.frame);
  return arr;
}

export function removeKeyframeAt(list: Keyframe[] | undefined, frame: number): Keyframe[] {
  return (list ?? []).filter((k) => k.frame !== frame);
}
