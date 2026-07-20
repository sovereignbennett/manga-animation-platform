/**
 * Per-layer effects. Applied at render time on top of the sampled pose.
 * Effects are non-destructive and stored on the layer.
 */
import type { EasingName } from "@/utils/easing";
import type { ShakeParams, ShakeProfile } from "@/services/shakes";
import type { EasingKind, Keyframe } from "@/types/animation";

export type EffectKind =
  | "glow"
  | "motionBlur"
  | "chromatic"
  | "shake"
  | "impact";

export interface GlowEffect {
  kind: "glow";
  enabled: boolean;
  color: string;      // hex
  strength: number;   // 0..10
  innerStrength: number; // 0..10
  quality: number;    // 0.1..1
}

export interface MotionBlurEffect {
  kind: "motionBlur";
  enabled: boolean;
  amount: number;     // 0..24
}

export interface ChromaticEffect {
  kind: "chromatic";
  enabled: boolean;
  offset: number;     // px, 0..16
  angle: number;      // deg
}

export interface ShakeEffect {
  kind: "shake";
  enabled: boolean;
  amplitude: number;  // px
  frequency: number;  // hz
  rotational: number; // deg (max)
  profile?: ShakeProfile;
  presetId?: string;
  intensity?: number;
  speed?: number;
  randomness?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  decay?: number;
  seed?: number;
  easing?: EasingName;
  velocity?: number;
  duration?: number;
  delay?: number;
  loop?: boolean;
  reverse?: boolean;
  noiseType?: "smooth" | "perlin" | "simplex" | "jitter" | "glitch";
  smoothness?: number;
  blendMode?: "add" | "replace" | "multiply";
  space?: "layer" | "camera";
  keyframes?: Partial<Record<ShakeAnimatableProp, Keyframe[]>>;
}

export type ShakeAnimatableProp =
  | "intensity"
  | "speed"
  | "velocity"
  | "frequency"
  | "x"
  | "y"
  | "rotation"
  | "scale"
  | "decay";

export const SHAKE_ANIMATABLE_PROPS: ShakeAnimatableProp[] = [
  "intensity",
  "speed",
  "velocity",
  "frequency",
  "x",
  "y",
  "rotation",
  "scale",
  "decay",
];

export interface ImpactEffect {
  kind: "impact";
  enabled: boolean;
  frame: number;      // trigger frame
  duration: number;   // frames
  scale: number;      // 0..1 extra scale at impact
  flash: number;      // 0..1 white flash strength
}

export type LayerEffect =
  | GlowEffect
  | MotionBlurEffect
  | ChromaticEffect
  | ShakeEffect
  | ImpactEffect;

export const EFFECT_DEFAULTS: Record<EffectKind, LayerEffect> = {
  glow:       { kind: "glow", enabled: true, color: "#d44dc9", strength: 4, innerStrength: 0, quality: 0.3 },
  motionBlur: { kind: "motionBlur", enabled: true, amount: 6 },
  chromatic:  { kind: "chromatic", enabled: true, offset: 4, angle: 0 },
  shake:      {
    kind: "shake",
    enabled: true,
    amplitude: 4,
    frequency: 20,
    rotational: 1,
    presetId: "handheld",
    profile: "handheld",
    intensity: 1,
    speed: 1,
    randomness: 0.5,
    x: 4,
    y: 4,
    rotation: 0.017,
    scale: 0,
    decay: 0,
    seed: 1337,
    easing: "easeOutCubic",
    velocity: 1,
    duration: 0,
    delay: 0,
    loop: false,
    reverse: false,
    noiseType: "smooth",
    smoothness: 0.5,
    blendMode: "add",
    space: "layer",
  },
  impact:     { kind: "impact", enabled: true, frame: 0, duration: 8, scale: 0.25, flash: 0.4 },
};

export function normalizeShakeParams(effect: ShakeEffect): ShakeParams {
  return {
    profile: effect.profile ?? "noise",
    intensity: effect.intensity ?? 1,
    speed: effect.speed ?? 1,
    frequency: effect.frequency,
    randomness: effect.randomness ?? 0.5,
    rotation: effect.rotation ?? (effect.rotational * Math.PI) / 180,
    x: effect.x ?? effect.amplitude,
    y: effect.y ?? effect.amplitude,
    scale: effect.scale ?? 0,
    decay: effect.decay ?? 0,
    seed: effect.seed ?? 1337,
    easing: effect.easing ?? "easeOutCubic",
  };
}

export function upsertEffectKeyframe(
  list: Keyframe[] | undefined,
  frame: number,
  value: number,
  easing: EasingKind = "easeInOutQuad",
): Keyframe[] {
  const next = [...(list ?? [])].filter((kf) => kf.frame !== frame);
  next.push({ frame, value, easing });
  return next.sort((a, b) => a.frame - b.frame);
}

export function removeEffectKeyframe(
  list: Keyframe[] | undefined,
  frame: number,
): Keyframe[] {
  return (list ?? []).filter((kf) => kf.frame !== frame);
}

export const EFFECT_LABELS: Record<EffectKind, string> = {
  glow: "Glow",
  motionBlur: "Motion Blur",
  chromatic: "Chromatic Aberration",
  shake: "Shake",
  impact: "Impact Frame",
};
