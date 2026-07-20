import type { EasingName } from "@/utils/easing";

export interface Keyframe<T = number> {
  time: number;        // seconds
  value: T;
  easing?: EasingName; // easing from THIS keyframe to the next
}

export interface AnimationTrack<T = number> {
  id: string;
  property: string;    // e.g. "transform.x", "opacity"
  keyframes: Keyframe<T>[];
}

export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  tracks: AnimationTrack[];
}
