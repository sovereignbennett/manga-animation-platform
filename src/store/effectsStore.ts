import { create } from "zustand";
import { defaultsOf, EffectRegistry, type EffectParams } from "@/services/effects";
import { uid } from "@/utils/id";

export interface EffectInstance {
  instanceId: string;
  effectId: string;
  params: EffectParams;
  enabled: boolean;
}

interface EffectsState {
  stack: EffectInstance[];
  add: (effectId: string) => void;
  remove: (instanceId: string) => void;
  toggle: (instanceId: string) => void;
  patch: (instanceId: string, patch: EffectParams) => void;
  move: (instanceId: string, delta: number) => void;
}

export const useEffectsStore = create<EffectsState>((set) => ({
  stack: [],
  add: (effectId) => set((s) => {
    const eff = EffectRegistry.get(effectId);
    if (!eff) return s;
    return {
      stack: [...s.stack, {
        instanceId: uid("fx"),
        effectId,
        params: defaultsOf(eff),
        enabled: true,
      }],
    };
  }),
  remove: (instanceId) => set((s) => ({ stack: s.stack.filter((i) => i.instanceId !== instanceId) })),
  toggle: (instanceId) => set((s) => ({
    stack: s.stack.map((i) => i.instanceId === instanceId ? { ...i, enabled: !i.enabled } : i),
  })),
  patch: (instanceId, patch) => set((s) => ({
    stack: s.stack.map((i) => i.instanceId === instanceId ? { ...i, params: { ...i.params, ...patch } } : i),
  })),
  move: (instanceId, delta) => set((s) => {
    const idx = s.stack.findIndex((i) => i.instanceId === instanceId);
    if (idx < 0) return s;
    const next = Math.max(0, Math.min(s.stack.length - 1, idx + delta));
    if (next === idx) return s;
    const stack = s.stack.slice();
    const [item] = stack.splice(idx, 1);
    stack.splice(next, 0, item);
    return { stack };
  }),
}));
