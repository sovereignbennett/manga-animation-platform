import { create } from "zustand";
import type { ID, Layer } from "@/types";
import { IDENTITY_TRANSFORM } from "@/types";
import { uid } from "@/utils/id";

interface LayersState {
  layers: Layer[];
  selectedId: ID | null;
  select: (id: ID | null) => void;
  add: (partial: Partial<Layer> & Pick<Layer, "kind" | "name">) => Layer;
  update: (id: ID, patch: Partial<Layer>) => void;
  remove: (id: ID) => void;
  setParent: (id: ID, parentId: ID | null) => void;
  toggleVisible: (id: ID) => void;
  toggleLocked: (id: ID) => void;
}

const seed: Layer[] = [
  { id: "layer-video", kind: "video", name: "Main Footage", parentId: null, visible: true, locked: false, color: "#7a5cff", transform: IDENTITY_TRANSFORM, range: { start: 0, end: 12 } },
  { id: "layer-text",  kind: "text",  name: "Title",        parentId: null, visible: true, locked: false, color: "#e0b64a", transform: IDENTITY_TRANSFORM, range: { start: 1, end: 4 } },
  { id: "layer-audio", kind: "audio", name: "Soundtrack",   parentId: null, visible: true, locked: false, color: "#58c98a", transform: IDENTITY_TRANSFORM, range: { start: 0, end: 12 } },
];

export const useLayersStore = create<LayersState>((set) => ({
  layers: seed,
  selectedId: seed[0].id,
  select: (id) => set({ selectedId: id }),
  add: (partial) => {
    const layer: Layer = {
      id: uid("layer"), parentId: null, visible: true, locked: false,
      color: "#7a5cff", transform: IDENTITY_TRANSFORM,
      range: { start: 0, end: 5 },
      ...partial,
    };
    set((s) => ({ layers: [...s.layers, layer], selectedId: layer.id }));
    return layer;
  },
  update: (id, patch) => set((s) => ({ layers: s.layers.map((l) => l.id === id ? { ...l, ...patch } : l) })),
  remove: (id) => set((s) => ({
    layers: s.layers.filter((l) => l.id !== id && l.parentId !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
  setParent: (id, parentId) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, parentId } : l),
  })),
  toggleVisible: (id) => set((s) => ({ layers: s.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l) })),
  toggleLocked: (id) => set((s) => ({ layers: s.layers.map((l) => l.id === id ? { ...l, locked: !l.locked } : l) })),
}));
