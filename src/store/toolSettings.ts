import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_TEXT_PROPS, type TextProps } from "@/services/text/renderText";

export interface BrushSettings {
  size: number;      // radius in layer-local px
  opacity: number;   // 0..1
  color: string;     // hex
  recentColors: string[];
}

export interface EraserSettings {
  size: number;
  opacity: number;
}

export interface PenSettings {
  closePath: boolean;
}

interface ToolSettingsState {
  brush: BrushSettings;
  eraser: EraserSettings;
  pen: PenSettings;
  text: TextProps;
  setBrush: (patch: Partial<BrushSettings>) => void;
  setEraser: (patch: Partial<EraserSettings>) => void;
  setPen: (patch: Partial<PenSettings>) => void;
  setText: (patch: Partial<TextProps>) => void;
  pushRecentColor: (hex: string) => void;
}

const STORAGE_KEY = "motioncut:tool-settings:v1";

const defaults = {
  brush: {
    size: 24,
    opacity: 1,
    color: "#ffffff",
    recentColors: ["#ffffff", "#000000", "#d44dc9", "#4dd4d4", "#ffcf4d"],
  } as BrushSettings,
  eraser: { size: 32, opacity: 1 } as EraserSettings,
  pen: { closePath: false } as PenSettings,
  text: { ...DEFAULT_TEXT_PROPS } as TextProps,
};

function load(): typeof defaults {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<typeof defaults>;
    return {
      brush: { ...defaults.brush, ...(parsed.brush ?? {}) },
      eraser: { ...defaults.eraser, ...(parsed.eraser ?? {}) },
      pen: { ...defaults.pen, ...(parsed.pen ?? {}) },
      text: { ...defaults.text, ...(parsed.text ?? {}) },
    };
  } catch {
    return defaults;
  }
}

const initial = load();

export const useToolSettings = create<ToolSettingsState>()(
  subscribeWithSelector((set, get) => ({
    ...initial,
    setBrush: (patch) => set((s) => ({ brush: { ...s.brush, ...patch } })),
    setEraser: (patch) => set((s) => ({ eraser: { ...s.eraser, ...patch } })),
    setPen: (patch) => set((s) => ({ pen: { ...s.pen, ...patch } })),
    setText: (patch) => set((s) => ({ text: { ...s.text, ...patch } })),
    pushRecentColor: (hex) => {
      const cur = get().brush.recentColors.filter((c) => c.toLowerCase() !== hex.toLowerCase());
      const next = [hex, ...cur].slice(0, 10);
      set((s) => ({ brush: { ...s.brush, recentColors: next } }));
    },
  })),
);

if (typeof window !== "undefined") {
  let t: ReturnType<typeof setTimeout> | null = null;
  useToolSettings.subscribe(
    (s) => ({ brush: s.brush, eraser: s.eraser, pen: s.pen, text: s.text }),
    (snap) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)); } catch { /* ignore */ }
      }, 300);
    },
  );
}
