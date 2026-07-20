import { create } from "zustand";
import { TransitionRegistry, type TransitionParams } from "@/services/transitions";

interface TransitionsState {
  selectedId: string | null;
  overrides: Record<string, Partial<TransitionParams>>;
  progress: number;
  select: (id: string | null) => void;
  setProgress: (p: number) => void;
  patch: (id: string, patch: Partial<TransitionParams>) => void;
}

export const useTransitionsStore = create<TransitionsState>((set) => ({
  selectedId: TransitionRegistry.list()[0]?.id ?? null,
  overrides: {},
  progress: 0.5,
  select: (id) => set({ selectedId: id }),
  setProgress: (p) => set({ progress: Math.max(0, Math.min(1, p)) }),
  patch: (id, patch) => set((s) => ({ overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } } })),
}));
