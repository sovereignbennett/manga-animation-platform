import { create } from "zustand";
import type { AudioParams, BeatMarker } from "@/services/audio";

export interface AudioTrackState {
  id: string;
  name: string;
  duration: number;
  params: AudioParams;
  peaks?: Float32Array;
  beats?: BeatMarker[];
}

interface AudioStoreState {
  tracks: AudioTrackState[];
  addTrack: (t: AudioTrackState) => void;
  patch: (id: string, p: Partial<AudioParams>) => void;
  setBeats: (id: string, beats: BeatMarker[]) => void;
  setPeaks: (id: string, peaks: Float32Array) => void;
  remove: (id: string) => void;
}

const defaultParams: AudioParams = { gain: 1, muted: false, fadeIn: 0.5, fadeOut: 1 };

export const useAudioStore = create<AudioStoreState>((set) => ({
  tracks: [
    { id: "demo", name: "Soundtrack (demo)", duration: 12, params: { ...defaultParams } },
  ],
  addTrack: (t) => set((s) => ({ tracks: [...s.tracks, t] })),
  patch: (id, p) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, params: { ...t.params, ...p } } : t),
  })),
  setBeats: (id, beats) => set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, beats } : t) })),
  setPeaks: (id, peaks) => set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, peaks } : t) })),
  remove: (id) => set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),
}));
