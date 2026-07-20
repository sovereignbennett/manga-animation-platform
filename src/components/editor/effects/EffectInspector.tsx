import { EffectRegistry, type EffectParamSpec } from "@/services/effects";
import { useEffectsStore } from "@/store/effectsStore";
import { useSelectionStore } from "@/store/selectionStore";
import { NumberField, ColorField, BoolField } from "@/components/editor";

export function EffectInspector() {
  const selId = useSelectionStore((s) => (s.kind === "effect" ? s.id : null));
  const inst = useEffectsStore((s) => s.stack.find((i) => i.instanceId === selId));
  const patch = useEffectsStore((s) => s.patch);
  if (!inst) return <div className="p-3 text-xs text-muted-foreground">No effect selected.</div>;
  const eff = EffectRegistry.get(inst.effectId);
  if (!eff) return null;
  const set = (key: string, value: unknown) => patch(inst.instanceId, { ...inst.params, [key]: value as never });

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-xs font-semibold">{eff.name}</div>
      {eff.params.map((spec: EffectParamSpec) => {
        const v = inst.params[spec.key];
        if (spec.kind === "number") return (
          <NumberField key={spec.key} label={spec.label} min={spec.min ?? 0} max={spec.max ?? 1} step={spec.step ?? 0.01} value={Number(v)} onChange={(nv) => set(spec.key, nv)} />
        );
        if (spec.kind === "color") return (
          <ColorField key={spec.key} label={spec.label} value={String(v)} onChange={(nv) => set(spec.key, nv)} />
        );
        if (spec.kind === "boolean") return (
          <BoolField key={spec.key} label={spec.label} value={Boolean(v)} onChange={(nv) => set(spec.key, nv)} />
        );
        if (spec.kind === "vec2") {
          const [x, y] = v as [number, number];
          return (
            <div key={spec.key} className="flex flex-col gap-1">
              <NumberField label={`${spec.label} X`} min={-64} max={64} step={0.5} value={x} onChange={(nv) => set(spec.key, [nv, y])} />
              <NumberField label={`${spec.label} Y`} min={-64} max={64} step={0.5} value={y} onChange={(nv) => set(spec.key, [x, nv])} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
