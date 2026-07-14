/**
 * Easing functions. All accept t in [0,1] and return an eased [0,1].
 *
 * Kept as pure functions so they can be composed, cached and unit tested.
 * Formulas mirror the "Robert Penner" / easings.net catalogue.
 */

import type { EasingKind } from "@/types/animation";

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const n1 = 7.5625;
const d1 = 2.75;

const easings: Record<EasingKind, (t: number) => number> = {
  linear: (t) => t,
  hold: (t) => (t >= 1 ? 1 : 0),

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  easeInBack: (t) => c3 * t * t * t - c1 * t * t,
  easeOutBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  easeInOutBack: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,

  easeOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  easeOutBounce: (t) => {
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export function ease(kind: EasingKind, t: number): number {
  const fn = easings[kind] ?? easings.linear;
  return fn(Math.max(0, Math.min(1, t)));
}

export const EASING_LABELS: Record<EasingKind, string> = {
  linear: "Linear",
  hold: "Hold",
  easeInQuad: "Ease In",
  easeOutQuad: "Ease Out",
  easeInOutQuad: "Ease In Out",
  easeInCubic: "Cubic In",
  easeOutCubic: "Cubic Out",
  easeInOutCubic: "Cubic In Out",
  easeInBack: "Back In",
  easeOutBack: "Back Out",
  easeInOutBack: "Back In Out",
  easeOutElastic: "Elastic",
  easeOutBounce: "Bounce",
};
