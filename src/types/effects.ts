/**
 * Per-layer effects. Applied at render time on top of the sampled pose.
 * Effects are non-destructive and stored on the layer.
 */

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
}

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
  shake:      { kind: "shake", enabled: true, amplitude: 4, frequency: 20, rotational: 1 },
  impact:     { kind: "impact", enabled: true, frame: 0, duration: 8, scale: 0.25, flash: 0.4 },
};

export const EFFECT_LABELS: Record<EffectKind, string> = {
  glow: "Glow",
  motionBlur: "Motion Blur",
  chromatic: "Chromatic Aberration",
  shake: "Shake",
  impact: "Impact Frame",
};
