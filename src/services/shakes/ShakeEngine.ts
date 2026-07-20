import { noise1D } from "@/utils/prng";
import { easingByName } from "@/utils/easing";
import type { ShakeParams, ShakeSample } from "./ShakeTypes";

const TAU = Math.PI * 2;

const zero = (): ShakeSample => ({ x: 0, y: 0, rotation: 0, scale: 0 });

const add = (...samples: ShakeSample[]): ShakeSample =>
  samples.reduce(
    (acc, s) => ({
      x: acc.x + s.x,
      y: acc.y + s.y,
      rotation: acc.rotation + s.rotation,
      scale: acc.scale + s.scale,
    }),
    zero(),
  );

const mul = (s: ShakeSample, amount: number): ShakeSample => ({
  x: s.x * amount,
  y: s.y * amount,
  rotation: s.rotation * amount,
  scale: s.scale * amount,
});

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const decay = (t: number, rate: number) => Math.exp(-Math.max(0, rate) * t);
const impulse = (t: number, attack: number, release: number) =>
  t < 0 ? 0 : (1 - Math.exp(-t / attack)) * Math.exp(-t / release);
const dampedSine = (t: number, hz: number, damping: number, phase = 0) =>
  Math.sin(t * TAU * hz + phase) * decay(t, damping);
const holdPulse = (t: number, start: number, end: number) =>
  t >= start && t <= end ? 1 : 0;

const stepNoise = (t: number, seed: number, frequency: number) =>
  noise1D(Math.floor(t * frequency) / frequency, seed, frequency);

const drift = (p: ShakeParams, t: number, amount = 1): ShakeSample => ({
  x: noise1D(t, p.seed, p.frequency * 0.28) * p.x * amount,
  y: noise1D(t + 31.7, p.seed ^ 0x9e3779b1, p.frequency * 0.22) * p.y * amount,
  rotation: noise1D(t + 12.2, p.seed ^ 0x85ebca6b, p.frequency * 0.18) * p.rotation * amount,
  scale: noise1D(t + 7.9, p.seed ^ 0xc2b2ae35, p.frequency * 0.12) * p.scale * amount,
});

const smoothNoise = (p: ShakeParams, t: number, amount = 1): ShakeSample => ({
  x: noise1D(t, p.seed, p.frequency) * p.x * amount,
  y: noise1D(t + 19.1, p.seed ^ 0x9e3779b1, p.frequency * 1.17) * p.y * amount,
  rotation: noise1D(t + 5.3, p.seed ^ 0x85ebca6b, p.frequency * 0.8) * p.rotation * amount,
  scale: noise1D(t + 2.1, p.seed ^ 0xc2b2ae35, p.frequency * 0.7) * p.scale * amount,
});

const spring = (p: ShakeParams, t: number, hz: number, damping: number, direction = 1): ShakeSample => ({
  x: dampedSine(t, hz, damping) * p.x * direction,
  y: dampedSine(t, hz * 1.12, damping, Math.PI / 2) * p.y * 0.35,
  rotation: dampedSine(t, hz * 0.7, damping, Math.PI / 3) * p.rotation,
  scale: Math.abs(dampedSine(t, hz, damping)) * p.scale,
});

const randomBurst = (p: ShakeParams, t: number, frequency: number, width: number): ShakeSample => {
  const phase = t * frequency;
  const beat = Math.floor(phase);
  const local = phase - beat;
  const envelope = Math.exp(-Math.pow(local / width, 2));
  const sx = stepNoise(beat + 0.1, p.seed, 1);
  const sy = stepNoise(beat + 4.4, p.seed ^ 0x9e3779b1, 1);
  return {
    x: sx * p.x * envelope,
    y: sy * p.y * envelope,
    rotation: stepNoise(beat + 7.7, p.seed ^ 0x85ebca6b, 1) * p.rotation * envelope,
    scale: Math.abs(stepNoise(beat + 9.2, p.seed ^ 0xc2b2ae35, 1)) * p.scale * envelope,
  };
};

const profiles = {
  noise(p: ShakeParams, t: number): ShakeSample {
    const rand = clamp01(p.randomness);
    const sine = Math.sin(t * TAU * p.frequency);
    return {
      x: (sine * (1 - rand) + noise1D(t, p.seed, p.frequency) * rand) * p.x,
      y: (sine * (1 - rand) + noise1D(t, p.seed ^ 0x9e3779b1, p.frequency) * rand) * p.y,
      rotation: noise1D(t, p.seed ^ 0x85ebca6b, p.frequency) * p.rotation,
      scale: noise1D(t, p.seed ^ 0xc2b2ae35, p.frequency) * p.scale,
    };
  },

  impact(p: ShakeParams, t: number): ShakeSample {
    const hit = impulse(t, 0.012, 0.09);
    const rebound = dampedSine(Math.max(0, t - 0.045), 9, 15) * 0.18;
    return add(
      { x: -p.x * hit, y: p.y * hit * 0.72, rotation: -p.rotation * hit, scale: p.scale * hit },
      { x: p.x * rebound, y: -p.y * rebound * 0.45, rotation: p.rotation * rebound, scale: -p.scale * rebound },
    );
  },

  punch(p: ShakeParams, t: number): ShakeSample {
    const hit = impulse(t, 0.01, 0.055);
    const snapBack = impulse(Math.max(0, t - 0.035), 0.015, 0.05);
    return {
      x: p.x * (hit - snapBack * 0.75),
      y: Math.sin(t * TAU * 18) * p.y * decay(t, 22),
      rotation: p.rotation * (hit - snapBack),
      scale: 0,
    };
  },

  earthquake(p: ShakeParams, t: number): ShakeSample {
    return add(
      smoothNoise({ ...p, frequency: p.frequency * 0.55 }, t, 0.8),
      smoothNoise({ ...p, frequency: p.frequency * 1.4 }, t + 17, 0.45),
      randomBurst(p, t, 1.8, 0.22),
    );
  },

  camera(p: ShakeParams, t: number): ShakeSample {
    return add(
      drift(p, t, 0.78),
      smoothNoise({ ...p, frequency: p.frequency * 3.2 }, t, 0.12),
      { x: 0, y: 0, rotation: Math.sin(t * 0.37 + p.seed) * p.rotation * 0.35, scale: Math.sin(t * 0.21) * p.scale },
    );
  },

  handheld(p: ShakeParams, t: number): ShakeSample {
    return add(
      drift(p, t, 0.65),
      smoothNoise({ ...p, frequency: p.frequency * 2 }, t, 0.22),
    );
  },

  whip(p: ShakeParams, t: number): ShakeSample {
    const thrust = impulse(t, 0.018, 0.075);
    const elastic = dampedSine(Math.max(0, t - 0.055), 5.5, 5.2);
    return {
      x: p.x * (thrust * 1.2 - elastic * 0.82),
      y: p.y * elastic * 0.15,
      rotation: p.rotation * (thrust - elastic * 0.65),
      scale: p.scale * Math.abs(elastic),
    };
  },

  bass(p: ShakeParams, t: number): ShakeSample {
    const phase = (t * p.frequency) % 1;
    const pulse = Math.pow(1 - clamp01(phase), 3);
    return {
      x: Math.sin(t * TAU * p.frequency * 0.5) * p.x * 0.15 * pulse,
      y: -p.y * pulse,
      rotation: p.rotation * Math.sin(t * TAU * p.frequency) * pulse,
      scale: p.scale * pulse,
    };
  },

  glitch(p: ShakeParams, t: number): ShakeSample {
    const frame = Math.floor(t * p.frequency);
    const freeze = Math.abs(noise1D(frame, p.seed ^ 0x6d2b79f5, 1)) > 0.5 ? 1 : 0.25;
    return {
      x: stepNoise(t, p.seed, p.frequency) * p.x * freeze,
      y: stepNoise(t + 9.2, p.seed ^ 0x9e3779b1, p.frequency * 1.7) * p.y * freeze,
      rotation: stepNoise(t + 3.1, p.seed ^ 0x85ebca6b, p.frequency * 0.8) * p.rotation * 1.4,
      scale: stepNoise(t + 2.4, p.seed ^ 0xc2b2ae35, p.frequency * 0.5) * p.scale,
    };
  },

  bounce(p: ShakeParams, t: number): ShakeSample {
    const b = Math.abs(dampedSine(t, p.frequency, 2.8));
    return {
      x: 0,
      y: -p.y * b,
      rotation: p.rotation * dampedSine(t, p.frequency * 0.5, 3.5),
      scale: p.scale * b,
    };
  },

  micro(p: ShakeParams, t: number): ShakeSample {
    return add(
      smoothNoise(p, t, 0.5),
      { x: Math.sin(t * TAU * p.frequency * 1.7) * p.x * 0.2, y: Math.cos(t * TAU * p.frequency * 1.3) * p.y * 0.2, rotation: 0, scale: 0 },
    );
  },

  velocity(p: ShakeParams, t: number): ShakeSample {
    const velocityGate = Math.pow(Math.abs(Math.sin(t * TAU * p.frequency * 0.35)), 1.8);
    return mul(add(smoothNoise(p, t, 0.55), spring(p, t, 6, 4, 1)), velocityGate);
  },

  anime(p: ShakeParams, t: number): ShakeSample {
    const anticipation = -holdPulse(t, 0, 0.045) * 0.35;
    const impact = impulse(Math.max(0, t - 0.045), 0.008, 0.055);
    const hold = holdPulse(t, 0.07, 0.12);
    const recovery = dampedSine(Math.max(0, t - 0.12), 6, 6);
    return {
      x: p.x * (anticipation + impact * 1.25 - recovery * 0.45),
      y: p.y * (-anticipation * 0.6 + impact * 0.55 + recovery * 0.3),
      rotation: p.rotation * (-anticipation + impact - recovery * 0.5),
      scale: p.scale * (impact + hold * 0.7 - recovery * 0.25),
    };
  },
};

/**
 * ShakeEngine — pure math. Framework-free.
 *
 * Profiles compose distinct generators: impulses, springs, drift, bursts,
 * discontinuous jitter and beat pulses. Callers still use the same sample API.
 */
export const ShakeEngine = {
  sample(params: ShakeParams, t: number): ShakeSample {
    const time = Math.max(0, t * params.speed);
    const profile = params.profile ?? "noise";
    const generator = profiles[profile] ?? profiles.noise;
    const easing = easingByName(params.easing);
    const decayProgress = clamp01(time * params.decay);
    const envelope = params.decay > 0 ? 1 - easing(decayProgress) : 1;
    return mul(generator(params, time), params.intensity * envelope);
  },
};
