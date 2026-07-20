import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, Wind, Waves, Radio, Flame, Eye, EyeOff } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import type { EffectKind, LayerEffect } from "@/types/effects";
import { EFFECT_LABELS } from "@/types/effects";
import { cn } from "@/lib/utils";

const EFFECT_ICONS: Record<EffectKind, React.ComponentType<{ className?: string }>> = {
  glow: Zap, motionBlur: Wind, chromatic: Radio, shake: Waves, impact: Flame,
};

const EFFECT_HINTS: Record<EffectKind, string> = {
  glow: "Adds an outer/inner light around the layer.",
  motionBlur: "Softens fast movement and transition streaks.",
  chromatic: "Splits RGB channels for glitch and impact looks.",
  shake: "Applies camera-style movement to this layer only.",
  impact: "Pops scale and flash at a chosen frame.",
};

export function EffectsPanel() {
  const selectedId = useEditor((s) => s.selectedIds[0]);
  const layer = useEditor((s) => s.project.layers.find((l) => l.id === selectedId));
  const addEffect = useEditor((s) => s.addEffect);
  const removeEffect = useEditor((s) => s.removeEffect);
  const updateEffect = useEditor((s) => s.updateEffect);
  const selectedEffect = useEditor((s) => s.selectedEffect);
  const setSelectedEffect = useEditor((s) => s.setSelectedEffect);

  if (!layer || layer.kind !== "image") {
    return (
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-[11px] text-muted-foreground">Select an image layer to add effects.</p>
      </div>
    );
  }

  const kinds: EffectKind[] = ["glow", "motionBlur", "chromatic", "shake", "impact"];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-2/40 p-2.5">
        <div className="text-xs font-medium">Effects apply to {layer.name}</div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Add an effect below, then click its card to focus full controls in the Inspector.
        </p>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Add effect</div>
        <div className="grid grid-cols-5 gap-1">
          {kinds.map((k) => {
            const Icon = EFFECT_ICONS[k];
            return (
              <button
                key={k}
                onClick={() => addEffect(layer.id, k)}
                title={`${EFFECT_LABELS[k]} - ${EFFECT_HINTS[k]}`}
                className="group relative h-10 rounded-md border border-border bg-surface-2/50 flex items-center justify-center hover:border-primary/40 hover:text-primary transition"
              >
                <Icon className="w-4 h-4" />
                <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-48 rounded-md border border-border bg-popover px-2 py-1.5 text-left shadow-panel group-hover:block">
                  <span className="block text-[11px] font-medium text-popover-foreground">{EFFECT_LABELS[k]}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{EFFECT_HINTS[k]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {(layer.effects ?? []).map((eff, i) => (
            <motion.div
              key={`${eff.kind}-${i}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onClick={() => setSelectedEffect({ layerId: layer.id, index: i })}
              className={cn(
                "rounded-lg border bg-surface-2/40 p-2.5 cursor-pointer",
                selectedEffect?.layerId === layer.id && selectedEffect.index === i
                  ? "border-primary/60"
                  : "border-border",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{EFFECT_LABELS[eff.kind]}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{EFFECT_HINTS[eff.kind]}</div>
                </div>
                <button
                  className="tool-btn !w-6 !h-6"
                  onClick={() => updateEffect(layer.id, i, { enabled: !eff.enabled } as Partial<LayerEffect>)}
                  title={eff.enabled ? "Disable" : "Enable"}
                >
                  {eff.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-40" />}
                </button>
                <button
                  className="tool-btn !w-6 !h-6 hover:!text-destructive"
                  onClick={() => removeEffect(layer.id, i)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <EffectControls
                effect={eff}
                onChange={(patch) => updateEffect(layer.id, i, patch)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {(layer.effects ?? []).length === 0 && (
          <p className="text-[11px] text-muted-foreground px-1">No effects yet — pick one above.</p>
        )}
      </div>
    </div>
  );
}

function EffectControls({ effect, onChange }: { effect: LayerEffect; onChange: (p: Partial<LayerEffect>) => void }) {
  switch (effect.kind) {
    case "glow":
      return (
        <div className="space-y-1.5">
          <Slider label="Strength" value={effect.strength} min={0} max={12} step={0.1} onChange={(v) => onChange({ strength: v } as Partial<LayerEffect>)} />
          <Slider label="Inner" value={effect.innerStrength} min={0} max={12} step={0.1} onChange={(v) => onChange({ innerStrength: v } as Partial<LayerEffect>)} />
          <div className="flex items-center gap-2">
            <label className="text-[10px] w-14 text-muted-foreground">Color</label>
            <input
              type="color"
              value={effect.color}
              onChange={(e) => onChange({ color: e.target.value } as Partial<LayerEffect>)}
              className="w-7 h-7 rounded border border-border bg-transparent"
            />
          </div>
        </div>
      );
    case "motionBlur":
      return <Slider label="Amount" value={effect.amount} min={0} max={32} step={0.5} onChange={(v) => onChange({ amount: v } as Partial<LayerEffect>)} />;
    case "chromatic":
      return (
        <div className="space-y-1.5">
          <Slider label="Offset" value={effect.offset} min={0} max={20} step={0.5} onChange={(v) => onChange({ offset: v } as Partial<LayerEffect>)} />
          <Slider label="Angle" value={effect.angle} min={0} max={360} step={5} onChange={(v) => onChange({ angle: v } as Partial<LayerEffect>)} />
        </div>
      );
    case "shake":
      return (
        <div className="space-y-1.5">
          <Slider label="Amplitude" value={effect.amplitude} min={0} max={40} step={0.5} onChange={(v) => onChange({ amplitude: v } as Partial<LayerEffect>)} />
          <Slider label="Frequency" value={effect.frequency} min={0} max={80} step={1} onChange={(v) => onChange({ frequency: v } as Partial<LayerEffect>)} />
          <Slider label="Rotate" value={effect.rotational} min={0} max={20} step={0.5} onChange={(v) => onChange({ rotational: v } as Partial<LayerEffect>)} />
        </div>
      );
    case "impact":
      return (
        <div className="space-y-1.5">
          <Slider label="Frame" value={effect.frame} min={0} max={600} step={1} onChange={(v) => onChange({ frame: v } as Partial<LayerEffect>)} />
          <Slider label="Duration" value={effect.duration} min={1} max={60} step={1} onChange={(v) => onChange({ duration: v } as Partial<LayerEffect>)} />
          <Slider label="Scale" value={effect.scale} min={0} max={1.5} step={0.05} onChange={(v) => onChange({ scale: v } as Partial<LayerEffect>)} />
          <Slider label="Flash" value={effect.flash} min={0} max={1} step={0.05} onChange={(v) => onChange({ flash: v } as Partial<LayerEffect>)} />
        </div>
      );
  }
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] w-14 text-muted-foreground shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary h-1"
      />
      <span className="text-[10px] font-mono w-10 text-right text-foreground/70">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
  );
}

// re-export Plus so lucide import doesn't break tree-shake warnings
export { Plus };
