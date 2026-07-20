import type { ShakePreset } from "./ShakeTypes";

const p = (
  id: string,
  name: string,
  overrides: Partial<ShakePreset["params"]>,
  tags?: readonly string[],
): ShakePreset => ({
  id,
  name,
  tags,
  params: {
    intensity: 1, speed: 1, frequency: 10, randomness: 0.5,
    rotation: 0, x: 6, y: 6, scale: 0, decay: 0, seed: 1337,
    easing: "easeOutCubic",
    ...overrides,
  },
});

export const BUILTIN_SHAKES: readonly ShakePreset[] = [
  p("impact",     "Impact",     { profile: "impact", intensity: 2.2, frequency: 18, x: 28, y: 24, rotation: 0.09, scale: 0.04, decay: 4.5, randomness: 0.35, easing: "easeOutExpo" }, ["impact"]),
  p("punch",      "Punch",      { profile: "punch", intensity: 1.8, frequency: 18, x: 34, y: 3,  rotation: 0.015, scale: 0, decay: 5.5, randomness: 0.08, easing: "easeOutExpo" }, ["impact"]),
  p("earthquake", "Earthquake", { profile: "earthquake", intensity: 1, frequency: 5, x: 18, y: 18, rotation: 0.035, scale: 0.01, decay: 0, randomness: 0.95 }, ["ambient"]),
  p("camera",     "Camera Handheld", { profile: "camera", intensity: 0.45, frequency: 1.2, x: 5, y: 4, rotation: 0.008, scale: 0.004, decay: 0, randomness: 0.25 }, ["camera"]),
  p("handheld",   "Smooth Handheld", { profile: "handheld", intensity: 0.65, frequency: 0.9, x: 4, y: 5, rotation: 0.012, scale: 0.004, decay: 0, randomness: 0.35 }, ["camera"]),
  p("whip",       "Whip",       { profile: "whip", intensity: 1.5, frequency: 7, x: 54, y: 4, rotation: 0.12, scale: 0.02, decay: 3.5, randomness: 0.02, easing: "easeOutElastic" }, ["motion"]),
  p("bass",       "Bass",       { profile: "bass", intensity: 0.9, frequency: 2, x: 2, y: 13, rotation: 0.006, scale: 0.055, decay: 0.8, randomness: 0.05, easing: "easeOutCubic" }, ["audio"]),
  p("glitch",     "Glitch",     { profile: "glitch", intensity: 1.2, frequency: 12, x: 18, y: 9, rotation: 0.06, scale: 0.02, decay: 0.4, randomness: 1, easing: "linear" }, ["digital"]),
  p("bounce",     "Bounce",     { profile: "bounce", intensity: 1.2, frequency: 5, x: 0, y: 26, rotation: 0.004, scale: 0.08, decay: 1.4, randomness: 0.03, easing: "easeOutBounce" }, ["motion"]),
  p("micro",      "Micro Shake",{ profile: "micro", intensity: 0.3, frequency: 32, x: 1.2, y: 1.2, rotation: 0.003, scale: 0.001, decay: 0, randomness: 0.75 }, ["ambient"]),
  p("velocity",   "Velocity",   { profile: "velocity", intensity: 1.6, frequency: 10, x: 22, y: 7, rotation: 0.05, scale: 0.02, decay: 1.5, randomness: 0.18, easing: "easeOutExpo" }, ["motion"]),
  p("anime",      "Anime",      { profile: "anime", intensity: 2, frequency: 16, x: 34, y: 18, rotation: 0.12, scale: 0.07, decay: 1.2, randomness: 0.1, easing: "easeOutElastic" }, ["stylized"]),
];
