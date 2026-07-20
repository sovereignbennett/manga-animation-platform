import type { EasingName } from "@/utils/easing";

export type ShakeProfile =
  | "noise"
  | "impact"
  | "punch"
  | "earthquake"
  | "camera"
  | "handheld"
  | "whip"
  | "bass"
  | "glitch"
  | "bounce"
  | "micro"
  | "velocity"
  | "anime";

/** A per-preset parameter set. All fields are required so presets stay explicit. */
export interface ShakeParams {
  /** Motion-generator profile. Distinct profiles produce distinct cinematography. */
  profile?: ShakeProfile;
  /** Global amplitude multiplier (0..∞). */
  intensity: number;
  /** Playback speed multiplier applied to `t`. */
  speed: number;
  /** Oscillation frequency in Hz. */
  frequency: number;
  /** 0 = smooth sine-like, 1 = fully chaotic. */
  randomness: number;
  /** Rotation amplitude in radians. */
  rotation: number;
  /** Horizontal amplitude in pixels. */
  x: number;
  /** Vertical amplitude in pixels. */
  y: number;
  /** Scale amplitude (0..1 typical). */
  scale: number;
  /** Envelope decay per second (0 = no decay, 1 = fast decay). */
  decay: number;
  /** Deterministic seed. */
  seed: number;
  /** Envelope easing applied to the decay factor. */
  easing: EasingName;
}

export interface ShakePreset {
  id: string;
  name: string;
  params: ShakeParams;
  /** Optional freeform tags (e.g. "impact", "camera"). */
  tags?: readonly string[];
}

/** Result of sampling a shake at a given time. */
export interface ShakeSample {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}
