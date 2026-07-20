import { useShakesStore, useResolvedShake } from "@/store/shakesStore";
import { ShakeRegistry } from "@/services/shakes";
import { cn } from "@/lib/utils";
export function ShakePicker() {
  const selectedId = useShakesStore((s) => s.selectedId);
  const select = useShakesStore((s) => s.select);
  const presets = ShakeRegistry.list();
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => select(p.id)}
          className={cn(
            "rounded-md border border-border px-2 py-2 text-xs transition-colors",
            selectedId === p.id ? "bg-primary text-primary-foreground" : "surface hover:bg-surface-strong",
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function useSelectedShake() { return useResolvedShake(); }
