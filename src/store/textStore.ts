import { create } from "zustand";
import type { TextBlock, TextStyle } from "@/services/text";
import { uid } from "@/utils/id";

const defaultStyle: TextStyle = {
  fontFamily: "Inter",
  fontSize: 96,
  fontWeight: 800,
  letterSpacing: -2,
  lineHeight: 1.05,
  align: "center",
  color: "#ffffff",
  stroke: undefined,
  shadow: { color: "#000000", blur: 12, offsetX: 0, offsetY: 4 },
  glow: undefined,
  gradient: undefined,
  variableAxes: { wght: 800 },
};

interface TextState {
  blocks: TextBlock[];
  selectedId: string | null;
  add: (text: string) => TextBlock;
  update: (id: string, patch: Partial<TextBlock>) => void;
  updateStyle: (id: string, patch: Partial<TextStyle>) => void;
  select: (id: string | null) => void;
  remove: (id: string) => void;
}

export const useTextStore = create<TextState>((set) => ({
  blocks: [{ id: "title-1", text: "MOTIONCUT", style: { ...defaultStyle } }],
  selectedId: "title-1",
  add: (text) => {
    const block: TextBlock = { id: uid("text"), text, style: { ...defaultStyle } };
    set((s) => ({ blocks: [...s.blocks, block], selectedId: block.id }));
    return block;
  },
  update: (id, patch) => set((s) => ({ blocks: s.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) })),
  updateStyle: (id, patch) => set((s) => ({ blocks: s.blocks.map((b) => b.id === id ? { ...b, style: { ...b.style, ...patch } } : b) })),
  select: (id) => set({ selectedId: id }),
  remove: (id) => set((s) => ({
    blocks: s.blocks.filter((b) => b.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
}));
