import { useTransitionsStore } from "@/store/transitionsStore";
import { TransitionRegistry, TransitionEngine } from "@/services/transitions";
import { NumberField, SelectField } from "@/components/editor";
import { EASINGS, type EasingName } from "@/utils/easing";

const easingOptions = (Object.keys(EASINGS) as EasingName[]).map((v) => ({ value: v, label: v }));
const directionOptions = [
  { value: "left" as const, label: "left" },
  { value: "right" as const, label: "right" },
  { value: "up" as const, label: "up" },
  { value: "down" as const, label: "down" },
];

export function TransitionInspector() {
  const id = useTransitionsStore((s) => s.selectedId);
  const overrides = useTransitionsStore((s) => (id ? s.overrides[id] : undefined));
  const progress = useTransitionsStore((s) => s.progress);
  const setProgress = useTransitionsStore((s) => s.setProgress);
  const patch = useTransitionsStore((s) => s.patch);
  const base = id ? TransitionRegistry.get(id) : undefined;
  if (!id || !base) return <div className="p-3 text-xs text-muted-foreground">No transition selected.</div>;
  const p = { ...base.params, ...(overrides ?? {}) };
  const state = TransitionEngine.evaluate(id, progress);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="mb-1 text-xs font-semibold">{base.name}</div>
      <NumberField label="Progress"  min={0} max={1}   step={0.01} value={progress}   onChange={setProgress} />
      <NumberField label="Duration"  min={0.05} max={5} step={0.05} value={p.duration}  onChange={(v) => patch(id, { duration: v })} suffix="s" />
      <NumberField label="Strength"  min={0} max={3}   step={0.05} value={p.strength}  onChange={(v) => patch(id, { strength: v })} />
      <SelectField label="Direction" value={p.direction} options={directionOptions} onChange={(v) => patch(id, { direction: v })} />
      <SelectField label="Easing"    value={p.easing}    options={easingOptions}    onChange={(v) => patch(id, { easing: v })} />
      <div className="mt-2 rounded-md border border-border p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Preview</div>
        <div
          className="mx-auto h-14 w-14 rounded-md bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-accent)]"
          style={{
            opacity: state.opacity,
            transform: `translate(${state.translateX * 0.2}px, ${state.translateY * 0.2}px) rotate(${state.rotation}rad) scale(${state.scaleX}, ${state.scaleY})`,
            filter: `blur(${state.blur * 0.5}px)`,
          }}
        />
      </div>
    </div>
  );
}
