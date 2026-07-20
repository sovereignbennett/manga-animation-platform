export interface FontDefinition {
  family: string;
  displayName: string;
  variableAxes?: readonly string[]; // e.g. ["wght", "wdth", "opsz"]
  category: "sans" | "serif" | "display" | "mono" | "handwriting";
}

const store = new Map<string, FontDefinition>();
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const FontRegistry = {
  register(font: FontDefinition): void { store.set(font.family, font); emit(); },
  unregister(family: string): void { if (store.delete(family)) emit(); },
  get(family: string): FontDefinition | undefined { return store.get(family); },
  list(): FontDefinition[] { return Array.from(store.values()); },
  subscribe(l: Listener): () => void { listeners.add(l); return () => listeners.delete(l); },
};

// Register system fallbacks so the picker is never empty.
for (const f of [
  { family: "Inter", displayName: "Inter", variableAxes: ["wght"], category: "sans" as const },
  { family: "Georgia", displayName: "Georgia", category: "serif" as const },
  { family: "Menlo, monospace", displayName: "Menlo", category: "mono" as const },
  { family: "system-ui", displayName: "System", category: "sans" as const },
  { family: "Impact", displayName: "Impact", category: "display" as const },
]) FontRegistry.register(f);
