import type { Effect } from "./EffectTypes";

const store = new Map<string, Effect>();
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const EffectRegistry = {
  register(effect: Effect): void { store.set(effect.id, effect); emit(); },
  unregister(id: string): void { if (store.delete(id)) emit(); },
  get(id: string): Effect | undefined { return store.get(id); },
  list(): Effect[] { return Array.from(store.values()); },
  byCategory(cat: Effect["category"]): Effect[] { return this.list().filter((e) => e.category === cat); },
  subscribe(l: Listener): () => void { listeners.add(l); return () => listeners.delete(l); },
};
