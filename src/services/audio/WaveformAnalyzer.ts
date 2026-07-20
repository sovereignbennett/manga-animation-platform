import type { WaveformPeaks } from "./AudioTypes";

/** Downsample a mono channel to min/max peak pairs. Pure. */
export const WaveformAnalyzer = {
  peaks(samples: Float32Array, buckets: number, sampleRate: number): WaveformPeaks {
    const data = new Float32Array(buckets * 2);
    const per = samples.length / buckets;
    for (let i = 0; i < buckets; i++) {
      const from = Math.floor(i * per);
      const to = Math.min(samples.length, Math.floor((i + 1) * per));
      let mn = 0, mx = 0;
      for (let j = from; j < to; j++) {
        const v = samples[j];
        if (v < mn) mn = v;
        else if (v > mx) mx = v;
      }
      data[i * 2] = mn;
      data[i * 2 + 1] = mx;
    }
    return { data, bucketCount: buckets, bucketDuration: samples.length / sampleRate / buckets };
  },
};
