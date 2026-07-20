import { EffectRegistry } from "@/services/effects";
import { useEffectsStore } from "@/store/effectsStore";
import { useSelectionStore } from "@/store/selectionStore";
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiEye, FiEyeOff } from "react-icons/fi";
import { useEffectList } from "@/adapters/react";
import { cn } from "@/lib/utils";
export function EffectsPanel() {
  const catalog = useEffectList();
  const stack = useEffectsStore((s) => s.stack);
  const add = useEffectsStore((s) => s.add);
  const remove = useEffectsStore((s) => s.remove);
  const toggle = useEffectsStore((s) => s.toggle);
  const move = useEffectsStore((s) => s.move);
  const setSel = useSelectionStore((s) => s.set);
  const selId = useSelectionStore((s) => (s.kind === "effect" ? s.id : null));

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Add effect</div>
      <div className="grid grid-cols-2 gap-1.5">
        {catalog.map((eff) => (
          <button key={eff.id} onClick={() => add(eff.id)} className="surface flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-surface-strong">
            <span>{eff.name}</span>
            <FiPlus className="opacity-60" />
          </button>
        ))}
      </div>

      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Stack</div>
      {stack.length === 0 && <div className="text-xs text-muted-foreground">No effects.</div>}
      <div className="flex flex-col gap-1">
        {stack.map((inst) => {
          const eff = EffectRegistry.get(inst.effectId);
          return (
            <div
              key={inst.instanceId}
              onClick={() => setSel("effect", inst.instanceId)}
              className={cn(
                "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs",
                selId === inst.instanceId ? "bg-surface-strong" : "surface",
              )}
            >
              <button onClick={(e) => { e.stopPropagation(); toggle(inst.instanceId); }} className="opacity-70 hover:opacity-100">
                {inst.enabled ? <FiEye /> : <FiEyeOff />}
              </button>
              <span className="flex-1 truncate">{eff?.name ?? inst.effectId}</span>
              <button onClick={(e) => { e.stopPropagation(); move(inst.instanceId, -1); }} className="opacity-70 hover:opacity-100"><FiChevronUp /></button>
              <button onClick={(e) => { e.stopPropagation(); move(inst.instanceId, 1); }} className="opacity-70 hover:opacity-100"><FiChevronDown /></button>
              <button onClick={(e) => { e.stopPropagation(); remove(inst.instanceId); }} className="opacity-70 hover:opacity-100"><FiTrash2 /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
