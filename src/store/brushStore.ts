import { create } from "zustand";
import { BUILTIN_BRUSH_PRESETS, type BrushParams, type BrushTool, type Stroke } from "@/services/brush";

interface BrushState {
  tool: BrushTool;
  params: BrushParams;
  presetId: string;
  strokes: Stroke[];
  setTool: (t: BrushTool) => void;
  setPreset: (id: string) => void;
  patch: (p: Partial<BrushParams>) => void;
  addStroke: (s: Stroke) => void;
  undo: () => void;
  clear: () => void;
}

export const useBrushStore = create<BrushState>((set) => ({
  tool: BUILTIN_BRUSH_PRESETS[0].tool,
  params: { ...BUILTIN_BRUSH_PRESETS[0].params },
  presetId: BUILTIN_BRUSH_PRESETS[0].id,
  strokes: [],
  setTool: (tool) => set({ tool }),
  setPreset: (id) => {
    const preset = BUILTIN_BRUSH_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    set({ presetId: id, tool: preset.tool, params: { ...preset.params } });
  },
  patch: (p) => set((s) => ({ params: { ...s.params, ...p } })),
  addStroke: (s) => set((st) => ({ strokes: [...st.strokes, s] })),
  undo: () => set((s) => ({ strokes: s.strokes.slice(0, -1) })),
  clear: () => set({ strokes: [] }),
}));
