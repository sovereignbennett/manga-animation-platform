import type { ShakePreset } from "./ShakeTypes";
import { BUILTIN_SHAKES } from "./ShakePresets";

/** In-memory registry. Framework-free. */
const store = new Map<string, ShakePreset>();
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const ShakeRegistry = {
  register(preset: ShakePreset): void {
    store.set(preset.id, preset);
    emit();
  },
  unregister(id: string): void {
    if (store.delete(id)) emit();
  },
  get(id: string): ShakePreset | undefined {
    return store.get(id);
  },
  list(): ShakePreset[] {
    return Array.from(store.values());
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  clear(): void {
    store.clear();
    emit();
  },
};

// Self-registering built-ins.
for (const p of BUILTIN_SHAKES) ShakeRegistry.register(p);
