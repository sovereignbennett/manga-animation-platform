import type { EasingName } from "@/utils/easing";

/** Parameters shared by every transition. */
export interface TransitionParams {
  /** Duration in seconds. */
  duration: number;
  /** Easing curve name. */
  easing: EasingName;
  /** Direction hint used by directional transitions (Push, Slide, Whip). */
  direction: "left" | "right" | "up" | "down";
  /** Optional preset-specific numeric parameter (blur radius, zoom scale…). */
  strength: number;
}

/** Runtime state applied by a transition to a target. */
export interface TransitionState {
  opacity: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  translateX: number;
  translateY: number;
  blur: number;
  chromaticShift: number;
  /** [0..1] mask reveal amount. */
  maskReveal: number;
  /** Extra flash overlay 0..1. */
  flash: number;
}

export const IDENTITY_STATE: TransitionState = {
  opacity: 1, scaleX: 1, scaleY: 1, rotation: 0,
  translateX: 0, translateY: 0, blur: 0, chromaticShift: 0,
  maskReveal: 1, flash: 0,
};

/** A transition definition — pure function of progress [0..1]. */
export interface TransitionPreset {
  id: string;
  name: string;
  params: TransitionParams;
  /** progress 0 = start, 1 = end. */
  evaluate: (progress: number, params: TransitionParams) => TransitionState;
}
