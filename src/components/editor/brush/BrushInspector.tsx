import { useBrushStore } from "@/store/brushStore";
import { NumberField, ColorField, BoolField, SelectField } from "@/components/editor";
import { BrushPresetGrid } from "./BrushPresetGrid";
import type { BrushTool } from "@/services/brush";

const tools = [
  { value: "brush" as const, label: "Brush" },
  { value: "pen" as const, label: "Pen" },
  { value: "eraser" as const, label: "Eraser" },
  { value: "lasso" as const, label: "Lasso" },
];

export function BrushInspector() {
  const tool = useBrushStore((s) => s.tool);
  const params = useBrushStore((s) => s.params);
  const setTool = useBrushStore((s) => s.setTool);
  const patch = useBrushStore((s) => s.patch);
  const undo = useBrushStore((s) => s.undo);
  const clear = useBrushStore((s) => s.clear);

  return (
    <div className="flex flex-col gap-2 p-3">
      <BrushPresetGrid />
      <SelectField<BrushTool> label="Tool" value={tool} options={tools} onChange={setTool} />
      <NumberField label="Size"      min={1}  max={200} step={1}    value={params.size}      onChange={(v) => patch({ size: v })} suffix="px" />
      <NumberField label="Opacity"   min={0}  max={1}   step={0.01} value={params.opacity}   onChange={(v) => patch({ opacity: v })} />
      <NumberField label="Hardness"  min={0}  max={1}   step={0.01} value={params.hardness}  onChange={(v) => patch({ hardness: v })} />
      <NumberField label="Spacing"   min={0.05} max={2} step={0.01} value={params.spacing}   onChange={(v) => patch({ spacing: v })} />
      <NumberField label="Smoothing" min={0}  max={1}   step={0.01} value={params.smoothing} onChange={(v) => patch({ smoothing: v })} />
      <ColorField  label="Color"     value={params.color} onChange={(v) => patch({ color: v })} />
      <BoolField   label="Pressure Size"    value={params.pressureSize}    onChange={(v) => patch({ pressureSize: v })} />
      <BoolField   label="Pressure Opacity" value={params.pressureOpacity} onChange={(v) => patch({ pressureOpacity: v })} />
      <div className="mt-2 flex gap-1.5">
        <button onClick={undo}  className="surface flex-1 rounded-md px-2 py-1 text-xs hover:bg-surface-strong">Undo</button>
        <button onClick={clear} className="surface flex-1 rounded-md px-2 py-1 text-xs hover:bg-surface-strong">Clear</button>
      </div>
    </div>
  );
}
