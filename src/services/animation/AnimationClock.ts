/**
 * Deterministic animation clock. Framework-free; drive with any RAF loop.
 */
export interface ClockState {
  time: number;      // seconds
  playing: boolean;
  rate: number;
  duration: number;
}

export type ClockListener = (s: ClockState) => void;

export class AnimationClock {
  private state: ClockState;
  private listeners = new Set<ClockListener>();
  constructor(duration = 30) {
    this.state = { time: 0, playing: false, rate: 1, duration };
  }
  get snapshot(): ClockState { return this.state; }
  subscribe(l: ClockListener): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  private emit(): void { for (const l of this.listeners) l(this.state); }

  play(): void { if (!this.state.playing) { this.state = { ...this.state, playing: true }; this.emit(); } }
  pause(): void { if (this.state.playing) { this.state = { ...this.state, playing: false }; this.emit(); } }
  toggle(): void { this.state.playing ? this.pause() : this.play(); }
  seek(time: number): void { this.state = { ...this.state, time: Math.max(0, Math.min(this.state.duration, time)) }; this.emit(); }
  setRate(rate: number): void { this.state = { ...this.state, rate }; this.emit(); }
  setDuration(duration: number): void { this.state = { ...this.state, duration, time: Math.min(this.state.time, duration) }; this.emit(); }

  /** Advance by dt seconds. Call from a RAF loop. */
  tick(dt: number): void {
    if (!this.state.playing) return;
    let next = this.state.time + dt * this.state.rate;
    if (next >= this.state.duration) next = this.state.duration;
    this.state = { ...this.state, time: next };
    if (next >= this.state.duration) this.state = { ...this.state, playing: false };
    this.emit();
  }
}
