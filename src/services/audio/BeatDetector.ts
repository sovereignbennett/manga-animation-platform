import type { BeatMarker } from "./AudioTypes";

/**
 * Energy-based onset detection. Not perfect but dependency-free.
 * Splits the signal into short frames, computes RMS energy, and marks
 * frames whose energy exceeds `factor` × local average.
 */
export const BeatDetector = {
  detect(samples: Float32Array, sampleRate: number, opts?: {
    frameMs?: number; windowMs?: number; factor?: number; minGapMs?: number;
  }): BeatMarker[] {
    const frameMs = opts?.frameMs ?? 20;
    const windowMs = opts?.windowMs ?? 400;
    const factor = opts?.factor ?? 1.4;
    const minGapMs = opts?.minGapMs ?? 200;

    const frameSize = Math.max(1, Math.floor(sampleRate * frameMs / 1000));
    const windowFrames = Math.max(1, Math.floor(windowMs / frameMs));
    const frameCount = Math.floor(samples.length / frameSize);
    const energies = new Float32Array(frameCount);
    for (let f = 0; f < frameCount; f++) {
      let sum = 0;
      const base = f * frameSize;
      for (let i = 0; i < frameSize; i++) { const v = samples[base + i]; sum += v * v; }
      energies[f] = Math.sqrt(sum / frameSize);
    }
    const out: BeatMarker[] = [];
    let lastMs = -Infinity;
    for (let f = 0; f < frameCount; f++) {
      const from = Math.max(0, f - windowFrames);
      let avg = 0;
      for (let j = from; j <= f; j++) avg += energies[j];
      avg /= (f - from + 1);
      if (energies[f] > avg * factor) {
        const ms = f * frameMs;
        if (ms - lastMs >= minGapMs) {
          out.push({ time: ms / 1000, strength: Math.min(1, energies[f] / (avg + 1e-6) - 1) });
          lastMs = ms;
        }
      }
    }
    return out;
  },
};
