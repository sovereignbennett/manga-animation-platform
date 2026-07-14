/**
 * Animation domain types.
 *
 * Keyframes live PER-LAYER, PER-PROPERTY. When a property has zero
 * keyframes, the layer's static field is used. When it has one or more,
 * the sampled value overrides the static field during playback.
 */

export type AnimatableProp =
  "x" | "y" | "scaleX" | "scaleY" | "rotation" | "opacity" | "anchorX" | "anchorY";

export const ANIMATABLE_PROPS: AnimatableProp[] = [
  "x",
  "y",
  "scaleX",
  "scaleY",
  "rotation",
  "opacity",
  "anchorX",
  "anchorY",
];

export type EasingKind =
  | "linear"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeOutElastic"
  | "easeOutBounce"
  | "hold"; // step — value stays flat until the next keyframe

export interface Keyframe {
  frame: number;
  value: number;
  /** Easing applied on the OUT side of this keyframe (i.e. from this KF to the next). */
  easing: EasingKind;
}

export type Keyframes = Partial<Record<AnimatableProp, Keyframe[]>>;

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  /** Total length in frames at the project fps; sampling scales at apply time. */
  durationFrames: number;
  tracks: Partial<Record<AnimatableProp, Array<Omit<Keyframe, "frame"> & { t: number }>>>; // t in [0,1]
}
