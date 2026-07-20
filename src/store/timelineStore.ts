import { create } from "zustand";
import { TimelineModel, type TimelineSnapshot, type Track } from "@/services/timeline";
import type { Clip, ID } from "@/types";

const model = new TimelineModel();

// Seed demo tracks + clips so the timeline is not empty on first load.
const t1 = { id: "track-video", layerId: "layer-video", kind: "video" as const, color: "var(--color-track-video)", height: 56 };
const t2 = { id: "track-text",  layerId: "layer-text",  kind: "text"  as const, color: "var(--color-track-text)",  height: 44 };
const t3 = { id: "track-audio", layerId: "layer-audio", kind: "audio" as const, color: "var(--color-track-audio)", height: 44 };
model.addTrack(t1); model.addTrack(t2); model.addTrack(t3);
model.addClip({ id: "c1", layerId: "layer-video", range: { start: 0.5, end: 6 }, sourceOffset: 0, fadeIn: 0.3, fadeOut: 0.5 });
model.addClip({ id: "c2", layerId: "layer-video", range: { start: 6.2, end: 11 }, sourceOffset: 0 });
model.addClip({ id: "c3", layerId: "layer-text",  range: { start: 1, end: 4 },   sourceOffset: 0 });
model.addClip({ id: "c4", layerId: "layer-audio", range: { start: 0, end: 12 },  sourceOffset: 0, fadeIn: 0.5, fadeOut: 1 });

interface TimelineState {
  snapshot: TimelineSnapshot;
  playhead: number;
  setPlayhead: (t: number) => void;
  setZoom: (z: number) => void;
  addTrack: (t: Track) => void;
  addClip: (c: Clip) => void;
  moveClip: (id: ID, delta: number) => void;
  trimClip: (id: ID, edge: "start" | "end", newTime: number) => void;
  removeClip: (id: ID) => void;
}

export const useTimelineStore = create<TimelineState>((set) => {
  model.subscribe((snapshot) => set({ snapshot }));
  return {
    snapshot: model.snapshot,
    playhead: 0,
    setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
    setZoom: (z) => model.setZoom(z),
    addTrack: (t) => model.addTrack(t),
    addClip: (c) => model.addClip(c),
    moveClip: (id, delta) => model.moveClip(id, delta),
    trimClip: (id, edge, t) => model.trimClip(id, edge, t),
    removeClip: (id) => model.removeClip(id),
  };
});

export const timelineModel = model;
