export interface AudioClipMeta {
  id: string;
  name: string;
  duration: number; // seconds
  channels: number;
  sampleRate: number;
}

export interface AudioParams {
  gain: number;    // 0..2
  muted: boolean;
  fadeIn: number;  // seconds
  fadeOut: number; // seconds
}

export interface BeatMarker { time: number; strength: number }

export interface WaveformPeaks {
  /** Interleaved min/max pairs, normalised to [-1, 1]. */
  data: Float32Array;
  bucketCount: number;
  bucketDuration: number;
}
