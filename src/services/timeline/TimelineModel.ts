import type { Clip, ID } from "@/types";
import type { Track, TimelineSnapshot } from "./TimelineTypes";
import { TrackMath } from "./TrackMath";

/**
 * Pure in-memory timeline model. UI adapters mirror this into Zustand.
 * The model itself has no dependency on Zustand or React.
 */
export class TimelineModel {
  private state: TimelineSnapshot;
  private listeners = new Set<(s: TimelineSnapshot) => void>();

  constructor(initial?: Partial<TimelineSnapshot>) {
    this.state = {
      duration: 30, fps: 60, zoom: 80, scroll: 0,
      tracks: [], clips: [], markers: [],
      ...initial,
    };
  }
  get snapshot(): TimelineSnapshot { return this.state; }
  subscribe(l: (s: TimelineSnapshot) => void): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  private emit(): void { for (const l of this.listeners) l(this.state); }
  private set(patch: Partial<TimelineSnapshot>): void { this.state = { ...this.state, ...patch }; this.emit(); }

  setZoom(zoom: number): void { this.set({ zoom: Math.max(8, Math.min(800, zoom)) }); }
  setScroll(scroll: number): void { this.set({ scroll: Math.max(0, scroll) }); }
  setDuration(duration: number): void { this.set({ duration: Math.max(1, duration) }); }

  addTrack(track: Track): void { this.set({ tracks: [...this.state.tracks, track] }); }
  removeTrack(id: ID): void {
    this.set({
      tracks: this.state.tracks.filter((t) => t.id !== id),
      clips: this.state.clips.filter((c) => this.state.tracks.find((t) => t.layerId === c.layerId)?.id !== id),
    });
  }
  updateTrack(id: ID, patch: Partial<Track>): void {
    this.set({ tracks: this.state.tracks.map((t) => t.id === id ? { ...t, ...patch } : t) });
  }

  addClip(clip: Clip): void { this.set({ clips: [...this.state.clips, clip] }); }
  removeClip(id: ID): void { this.set({ clips: this.state.clips.filter((c) => c.id !== id) }); }
  updateClip(id: ID, patch: Partial<Clip>): void {
    this.set({ clips: this.state.clips.map((c) => c.id === id ? { ...c, ...patch } : c) });
  }
  moveClip(id: ID, deltaSeconds: number): void {
    const c = this.state.clips.find((x) => x.id === id);
    if (!c) return;
    this.updateClip(id, TrackMath.moveClip(c, deltaSeconds));
  }
  trimClip(id: ID, edge: "start" | "end", newTime: number): void {
    const c = this.state.clips.find((x) => x.id === id);
    if (!c) return;
    this.updateClip(id, TrackMath.trimClip(c, edge, newTime));
  }
}
