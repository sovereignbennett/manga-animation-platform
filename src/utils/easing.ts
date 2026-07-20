/**
 * Named easing functions. Pure, no dependencies. Input and output in [0, 1].
 */
export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;
export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutElastic: EasingFn = (t) => {
  const c = (2 * Math.PI) / 3;
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
};
export const easeOutBounce: EasingFn = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { const x = t - 1.5 / d1; return n1 * x * x + 0.75; }
  if (t < 2.5 / d1) { const x = t - 2.25 / d1; return n1 * x * x + 0.9375; }
  const x = t - 2.625 / d1; return n1 * x * x + 0.984375;
};

export const EASINGS: Record<string, EasingFn> = {
  linear, easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeOutExpo, easeOutElastic, easeOutBounce,
};

export type EasingName = keyof typeof EASINGS;

export const easingByName = (name: string | undefined): EasingFn =>
  (name && EASINGS[name]) || linear;
