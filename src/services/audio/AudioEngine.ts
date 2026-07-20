/**
 * AudioEngine — minimal WebAudio wrapper.
 * WebAudio is a browser standard, not a framework: services may use it.
 */
import type { AudioParams } from "./AudioTypes";

interface Track {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  params: AudioParams;
  startedAt: number;
  offset: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private tracks = new Map<string, Track>();

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  async decode(input: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.ensureCtx();
    return await ctx.decodeAudioData(input.slice(0));
  }

  addTrack(id: string, buffer: AudioBuffer, params: AudioParams): void {
    const ctx = this.ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = params.muted ? 0 : params.gain;
    gain.connect(ctx.destination);
    this.tracks.set(id, { buffer, source: null, gain, params, startedAt: 0, offset: 0 });
  }
  removeTrack(id: string): void {
    const t = this.tracks.get(id);
    if (!t) return;
    t.source?.stop();
    t.gain.disconnect();
    this.tracks.delete(id);
  }
  updateParams(id: string, patch: Partial<AudioParams>): void {
    const t = this.tracks.get(id);
    if (!t) return;
    t.params = { ...t.params, ...patch };
    t.gain.gain.value = t.params.muted ? 0 : t.params.gain;
  }
  play(id: string, atOffset = 0): void {
    const t = this.tracks.get(id);
    if (!t || !this.ctx) return;
    t.source?.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = t.buffer;
    src.connect(t.gain);
    src.start(0, atOffset);
    t.source = src;
    t.startedAt = this.ctx.currentTime;
    t.offset = atOffset;
    this.applyFades(t);
  }
  stop(id: string): void {
    const t = this.tracks.get(id);
    t?.source?.stop();
    if (t) t.source = null;
  }
  stopAll(): void { for (const id of this.tracks.keys()) this.stop(id); }

  private applyFades(t: Track): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const target = t.params.muted ? 0 : t.params.gain;
    const g = t.gain.gain;
    g.cancelScheduledValues(now);
    if (t.params.fadeIn > 0) {
      g.setValueAtTime(0, now);
      g.linearRampToValueAtTime(target, now + t.params.fadeIn);
    } else {
      g.setValueAtTime(target, now);
    }
    if (t.params.fadeOut > 0) {
      const endAt = now + (t.buffer.duration - t.offset);
      g.setValueAtTime(target, Math.max(now, endAt - t.params.fadeOut));
      g.linearRampToValueAtTime(0, endAt);
    }
  }

  /**
   * Extract the mono mixdown of an AudioBuffer as Float32 samples.
   * Suitable for waveform + beat analysis.
   */
  static mono(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
    const out = new Float32Array(buffer.length);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < out.length; i++) out[i] += data[i];
    }
    for (let i = 0; i < out.length; i++) out[i] /= buffer.numberOfChannels;
    return out;
  }
}
