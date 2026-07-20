import { useTextStore } from "@/store/textStore";
import { NumberField, ColorField, SelectField } from "@/components/editor";
import { FontPicker } from "./FontPicker";
import { GradientPicker } from "./GradientPicker";
import type { TextAlign } from "@/services/text";

const aligns = [
  { value: "left" as const, label: "left" },
  { value: "center" as const, label: "center" },
  { value: "right" as const, label: "right" },
  { value: "justify" as const, label: "justify" },
];

export function TextInspector() {
  const id = useTextStore((s) => s.selectedId);
  const block = useTextStore((s) => s.blocks.find((b) => b.id === id));
  const update = useTextStore((s) => s.update);
  const updateStyle = useTextStore((s) => s.updateStyle);
  if (!block) return <div className="p-3 text-xs text-muted-foreground">No text block selected.</div>;
  const st = block.style;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-xs font-semibold">Text</div>
      <textarea
        value={block.text}
        onChange={(e) => update(block.id, { text: e.target.value })}
        rows={2}
        className="surface w-full resize-none bg-transparent px-2 py-1.5 text-sm"
      />
      <FontPicker blockId={block.id} />
      <NumberField label="Font Size"     min={8}    max={400}  step={1}    value={st.fontSize}       onChange={(v) => updateStyle(block.id, { fontSize: v })} suffix="px" />
      <NumberField label="Weight"        min={100}  max={900}  step={100}  value={st.fontWeight}     onChange={(v) => updateStyle(block.id, { fontWeight: v, variableAxes: { ...st.variableAxes, wght: v } })} />
      <NumberField label="Letter Spacing" min={-10} max={40}   step={0.5}  value={st.letterSpacing}  onChange={(v) => updateStyle(block.id, { letterSpacing: v })} />
      <NumberField label="Line Height"   min={0.8}  max={3}    step={0.05} value={st.lineHeight}     onChange={(v) => updateStyle(block.id, { lineHeight: v })} />
      <SelectField<TextAlign> label="Align" value={st.align} options={aligns} onChange={(v) => updateStyle(block.id, { align: v })} />
      <ColorField  label="Color" value={st.color} onChange={(v) => updateStyle(block.id, { color: v })} />

      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Stroke</div>
      <ColorField label="Color" value={st.stroke?.color ?? "#000000"} onChange={(v) => updateStyle(block.id, { stroke: { color: v, width: st.stroke?.width ?? 0 } })} />
      <NumberField label="Width" min={0} max={20} step={0.5} value={st.stroke?.width ?? 0} onChange={(v) => updateStyle(block.id, { stroke: v > 0 ? { color: st.stroke?.color ?? "#000000", width: v } : undefined })} />

      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Shadow</div>
      <ColorField label="Color" value={st.shadow?.color ?? "#000000"} onChange={(v) => updateStyle(block.id, { shadow: { ...(st.shadow ?? { blur: 8, offsetX: 0, offsetY: 4 }), color: v } })} />
      <NumberField label="Blur" min={0} max={64} step={1} value={st.shadow?.blur ?? 0} onChange={(v) => updateStyle(block.id, { shadow: v > 0 ? { ...(st.shadow ?? { color: "#000000", offsetX: 0, offsetY: 0 }), blur: v } : undefined })} />

      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Glow</div>
      <NumberField label="Blur" min={0} max={64} step={1} value={st.glow?.blur ?? 0} onChange={(v) => updateStyle(block.id, { glow: v > 0 ? { color: st.glow?.color ?? "#ffffff", blur: v, intensity: 1 } : undefined })} />
      <ColorField label="Color" value={st.glow?.color ?? "#ffffff"} onChange={(v) => updateStyle(block.id, { glow: { color: v, blur: st.glow?.blur ?? 12, intensity: 1 } })} />

      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Gradient</div>
      <GradientPicker gradient={st.gradient} onChange={(g) => updateStyle(block.id, { gradient: g })} />
    </div>
  );
}
