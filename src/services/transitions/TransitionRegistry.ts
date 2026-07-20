import type { TransitionPreset } from "./TransitionTypes";
import { BUILTIN_TRANSITIONS } from "./TransitionPresets";

const store = new Map<string, TransitionPreset>();
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const TransitionRegistry = {
  register(preset: TransitionPreset): void { store.set(preset.id, preset); emit(); },
  unregister(id: string): void { if (store.delete(id)) emit(); },
  get(id: string): TransitionPreset | undefined { return store.get(id); },
  list(): TransitionPreset[] { return Array.from(store.values()); },
  subscribe(l: Listener): () => void { listeners.add(l); return () => listeners.delete(l); },
  clear(): void { store.clear(); emit(); },
};

for (const t of BUILTIN_TRANSITIONS) TransitionRegistry.register(t);
