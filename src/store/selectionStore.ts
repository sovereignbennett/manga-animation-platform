import { create } from "zustand";

/**
 * SelectionStore — cross-feature focus. The Inspector reads this to
 * decide which per-feature Inspector to mount.
 */
export type SelectionKind =
  | "layer" | "clip" | "shake" | "transition" | "effect"
  | "text" | "audio" | "brush" | "ai" | null;

interface SelectionState {
  kind: SelectionKind;
  id: string | null;
  set: (kind: SelectionKind, id: string | null) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  kind: "layer",
  id: null,
  set: (kind, id) => set({ kind, id }),
  clear: () => set({ kind: null, id: null }),
}));
