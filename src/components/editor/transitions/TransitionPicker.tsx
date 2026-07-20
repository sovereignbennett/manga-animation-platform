import { TransitionRegistry } from "@/services/transitions";
import { useTransitionsStore } from "@/store/transitionsStore";
import { cn } from "@/lib/utils";
export function TransitionPicker() {
  const list = TransitionRegistry.list();
  const selectedId = useTransitionsStore((s) => s.selectedId);
  const select = useTransitionsStore((s) => s.select);
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {list.map((t) => (
        <button
          key={t.id}
          onClick={() => select(t.id)}
          className={cn(
            "rounded-md border border-border px-2 py-2 text-xs",
            selectedId === t.id ? "bg-primary text-primary-foreground" : "surface hover:bg-surface-strong",
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
