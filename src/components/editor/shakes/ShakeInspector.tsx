import { useShakesStore } from "@/store/shakesStore";
import { ShakeRegistry } from "@/services/shakes";
import { NumberField, SelectField } from "@/components/editor";
import { EASINGS, type EasingName } from "@/utils/easing";

const easingOptions = (Object.keys(EASINGS) as EasingName[]).map((v) => ({ value: v, label: v }));

export function ShakeInspector() {
  const id = useShakesStore((s) => s.selectedId);
  const overrides = useShakesStore((s) => (id ? s.overrides[id] : undefined));
  const patch = useShakesStore((s) => s.patch);
  const reset = useShakesStore((s) => s.reset);
  const base = id ? ShakeRegistry.get(id) : undefined;
  if (!id || !base) return <div className="p-3 text-xs text-muted-foreground">No shake selected.</div>;
  const p = { ...base.params, ...(overrides ?? {}) };
  const set = (patchIn: Partial<typeof p>) => patch(id, patchIn);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">{base.name}</span>
        <button onClick={() => reset(id)} className="text-muted-foreground hover:text-foreground">reset</button>
      </div>
      <NumberField label="Intensity" min={0} max={4}   step={0.05} value={p.intensity}  onChange={(v) => set({ intensity: v })} />
      <NumberField label="Speed"     min={0} max={4}   step={0.05} value={p.speed}      onChange={(v) => set({ speed: v })} />
      <NumberField label="Frequency" min={0} max={60}  step={0.5}  value={p.frequency}  onChange={(v) => set({ frequency: v })} />
      <NumberField label="Randomness" min={0} max={1}  step={0.01} value={p.randomness} onChange={(v) => set({ randomness: v })} />
      <NumberField label="X"         min={0} max={80}  step={0.5}  value={p.x}          onChange={(v) => set({ x: v })} suffix="px" />
      <NumberField label="Y"         min={0} max={80}  step={0.5}  value={p.y}          onChange={(v) => set({ y: v })} suffix="px" />
      <NumberField label="Rotation"  min={0} max={0.5} step={0.005} value={p.rotation}  onChange={(v) => set({ rotation: v })} suffix="rad" />
      <NumberField label="Scale"     min={0} max={0.4} step={0.005} value={p.scale}     onChange={(v) => set({ scale: v })} />
      <NumberField label="Decay"     min={0} max={5}   step={0.05} value={p.decay}      onChange={(v) => set({ decay: v })} />
      <NumberField label="Seed"      min={0} max={9999} step={1}   value={p.seed}       onChange={(v) => set({ seed: v })} />
      <SelectField label="Easing" value={p.easing} options={easingOptions} onChange={(v) => set({ easing: v })} />
    </div>
  );
}
