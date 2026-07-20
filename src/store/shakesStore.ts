import { create } from "zustand";
import type { ShakePreset } from "@/services/shakes";
import { ShakeRegistry } from "@/services/shakes";

interface ShakesState {
  selectedId: string | null;
  overrides: Record<string, Partial<ShakePreset["params"]>>;
  select: (id: string | null) => void;
  patch: (id: string, patch: Partial<ShakePreset["params"]>) => void;
  reset: (id: string) => void;
}

export const useShakesStore = create<ShakesState>((set) => ({
  selectedId: ShakeRegistry.list()[0]?.id ?? null,
  overrides: {},
  select: (id) => set({ selectedId: id }),
  patch: (id, patch) => set((s) => ({ overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } } })),
  reset: (id) => set((s) => {
    const { [id]: _, ...rest } = s.overrides;
    void _;
    return { overrides: rest };
  }),
}));

/** Return the merged preset (base + overrides). Nullable. */
export const useResolvedShake = (): ShakePreset | null => {
  const id = useShakesStore((s) => s.selectedId);
  const overrides = useShakesStore((s) => s.overrides);
  if (!id) return null;
  const base = ShakeRegistry.get(id);
  if (!base) return null;
  return { ...base, params: { ...base.params, ...(overrides[id] ?? {}) } };
};
