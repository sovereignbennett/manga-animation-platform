import { useBrushStore } from "@/store/brushStore";
import { BUILTIN_BRUSH_PRESETS } from "@/services/brush";
import { cn } from "@/lib/utils";
export function BrushPresetGrid() {
  const presetId = useBrushStore((s) => s.presetId);
  const setPreset = useBrushStore((s) => s.setPreset);
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {BUILTIN_BRUSH_PRESETS.map((p) => (
        <button key={p.id} onClick={() => setPreset(p.id)}
          className={cn(
            "rounded-md border border-border px-2 py-1.5 text-xs",
            presetId === p.id ? "bg-primary text-primary-foreground" : "surface hover:bg-surface-strong",
          )}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
