import { easingByName } from "@/utils/easing";
import { IDENTITY_STATE, type TransitionPreset, type TransitionState } from "./TransitionTypes";
import { TransitionRegistry } from "./TransitionRegistry";

/**
 * TransitionEngine — pure. Given a preset id + progress, returns a
 * TransitionState. Callers translate the state to their renderer.
 */
export const TransitionEngine = {
  evaluate(presetId: string, progress: number): TransitionState {
    const preset = TransitionRegistry.get(presetId);
    if (!preset) return IDENTITY_STATE;
    const eased = easingByName(preset.params.easing)(Math.max(0, Math.min(1, progress)));
    return preset.evaluate(eased, preset.params);
  },
  /** Compose two states multiplicatively (useful when stacking transitions). */
  compose(a: TransitionState, b: TransitionState): TransitionState {
    return {
      opacity: a.opacity * b.opacity,
      scaleX: a.scaleX * b.scaleX,
      scaleY: a.scaleY * b.scaleY,
      rotation: a.rotation + b.rotation,
      translateX: a.translateX + b.translateX,
      translateY: a.translateY + b.translateY,
      blur: a.blur + b.blur,
      chromaticShift: a.chromaticShift + b.chromaticShift,
      maskReveal: Math.min(a.maskReveal, b.maskReveal),
      flash: Math.max(a.flash, b.flash),
    };
  },
  register(preset: TransitionPreset): void {
    TransitionRegistry.register(preset);
  },
};
