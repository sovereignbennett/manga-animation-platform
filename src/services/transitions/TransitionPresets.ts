import { IDENTITY_STATE, type TransitionPreset, type TransitionState } from "./TransitionTypes";

const defaults = {
  duration: 0.5, easing: "easeOutCubic" as const,
  direction: "left" as const, strength: 1,
};

const dirVec = (dir: "left" | "right" | "up" | "down"): [number, number] => {
  switch (dir) {
    case "left": return [-1, 0];
    case "right": return [1, 0];
    case "up": return [0, -1];
    case "down": return [0, 1];
  }
};

const mk = (
  id: string, name: string,
  evaluate: TransitionPreset["evaluate"],
  overrides: Partial<TransitionPreset["params"]> = {},
): TransitionPreset => ({
  id, name,
  params: { ...defaults, ...overrides },
  evaluate,
});

const s = (patch: Partial<TransitionState>): TransitionState => ({ ...IDENTITY_STATE, ...patch });

export const BUILTIN_TRANSITIONS: readonly TransitionPreset[] = [
  mk("fade",       "Fade",       (p) => s({ opacity: p })),
  mk("flash",      "Flash",      (p) => s({ opacity: p, flash: 1 - Math.abs(p * 2 - 1) })),
  mk("blur",       "Blur",       (p, pr) => s({ opacity: p, blur: (1 - p) * 20 * pr.strength })),
  mk("zoom",       "Zoom",       (p, pr) => { const sc = 1 + (1 - p) * 0.6 * pr.strength; return s({ opacity: p, scaleX: sc, scaleY: sc }); }),
  mk("whip",       "Whip",       (p, pr) => { const [dx] = dirVec(pr.direction); return s({ opacity: p, translateX: dx * (1 - p) * 400 * pr.strength, blur: (1 - p) * 30 }); }),
  mk("spin",       "Spin",       (p, pr) => s({ opacity: p, rotation: (1 - p) * Math.PI * 2 * pr.strength })),
  mk("stretch",    "Stretch",    (p) => s({ opacity: p, scaleX: 0.2 + p * 0.8, scaleY: 1.6 - p * 0.6 })),
  mk("rgb",        "RGB",        (p, pr) => s({ opacity: p, chromaticShift: (1 - p) * 30 * pr.strength })),
  mk("motionBlur", "Motion Blur",(p, pr) => { const [dx, dy] = dirVec(pr.direction); return s({ opacity: p, translateX: dx * (1 - p) * 120, translateY: dy * (1 - p) * 120, blur: (1 - p) * 12 * pr.strength }); }),
  mk("filmBurn",   "Film Burn",  (p) => s({ opacity: p, flash: Math.max(0, 1 - Math.abs(p * 2 - 1)) * 1.2 })),
  mk("maskReveal", "Mask Reveal",(p) => s({ maskReveal: p })),
  mk("push",       "Push",       (p, pr) => { const [dx, dy] = dirVec(pr.direction); return s({ translateX: dx * (1 - p) * 800, translateY: dy * (1 - p) * 800 }); }),
  mk("slide",      "Slide",      (p, pr) => { const [dx, dy] = dirVec(pr.direction); return s({ opacity: p, translateX: dx * (1 - p) * 400, translateY: dy * (1 - p) * 400 }); }),
];
