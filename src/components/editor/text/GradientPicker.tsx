import type { TextGradient } from "@/services/text";
import { GradientResolver } from "@/services/text";

interface Props { gradient: TextGradient | undefined; onChange: (g: TextGradient | undefined) => void }

const defaultGradient: TextGradient = {
  type: "linear", angle: 45,
  stops: [{ offset: 0, color: "#ff5cff" }, { offset: 1, color: "#5cffff" }],
};

export function GradientPicker({ gradient, onChange }: Props) {
  const g = gradient ?? defaultGradient;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!gradient} onChange={(e) => onChange(e.target.checked ? g : undefined)} className="h-4 w-4 accent-[color:var(--color-primary)]" />
        <span>Enable gradient</span>
      </label>
      {gradient && (
        <>
          <div className="h-6 rounded-md border border-border" style={{ background: GradientResolver.toCss(gradient) }} />
          <div className="flex gap-2">
            {gradient.stops.map((s, i) => (
              <input key={i} type="color" value={s.color}
                onChange={(e) => onChange({ ...gradient, stops: gradient.stops.map((st, si) => si === i ? { ...st, color: e.target.value } : st) })}
                className="h-7 w-10 rounded border border-border bg-transparent" />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-16">Angle</span>
            <input type="range" min={0} max={360} value={gradient.angle} onChange={(e) => onChange({ ...gradient, angle: parseInt(e.target.value) })} className="flex-1" />
            <span className="w-8 text-right">{gradient.angle}°</span>
          </label>
        </>
      )}
    </div>
  );
}
