/**
 * Seeded pseudo-random generators. Deterministic and framework-free.
 * mulberry32 for uniform, plus a fast 1D value-noise variant for shakes.
 */

export interface PRNG {
  next(): number;              // uniform in [0, 1)
  range(min: number, max: number): number;
  bipolar(): number;           // uniform in [-1, 1)
}

export const createPRNG = (seed: number): PRNG => {
  let s = seed >>> 0 || 1;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    bipolar: () => next() * 2 - 1,
  };
};

const hash = (n: number, seed: number): number => {
  let h = Math.imul(n ^ seed, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967296) * 2 - 1;
};

/**
 * Smooth 1D noise in [-1, 1]. Sampling at increasing t yields a
 * continuous shake path. `frequency` controls oscillation speed.
 */
export const noise1D = (t: number, seed: number, frequency = 1): number => {
  const x = t * frequency;
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, seed);
  const b = hash(i + 1, seed);
  const u = f * f * (3 - 2 * f); // smoothstep
  return a * (1 - u) + b * u;
};
