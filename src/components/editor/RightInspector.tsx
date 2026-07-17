import { Diamond } from "lucide-react";
import { useEditor, type BlendMode, type Layer } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import type { AnimatableProp } from "@/types/animation";

const BLENDS: BlendMode[] = ["normal", "multiply", "screen", "overlay", "add", "lighten", "darken"];

export function RightInspector() {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const currentFrame = useEditor((s) => s.currentFrame);
  const updateLayer = useEditor((s) => s.updateLayer);
  const setKeyframe = useEditor((s) => s.setKeyframe);
  const removeKeyframe = useEditor((s) => s.removeKeyframe);
  const layer = project.layers.find((l) => l.id === selectedIds[0]);

  const hasKf = (prop: AnimatableProp) =>
    !!layer?.keyframes?.[prop]?.some((k) => k.frame === currentFrame);

  const toggleKf = (prop: AnimatableProp) => {
    if (!layer) return;
    if (hasKf(prop)) removeKeyframe(layer.id, prop, currentFrame);
    else setKeyframe(layer.id, prop, currentFrame, layer[prop] as number);
  };

  return (
    <aside className="w-70 shrink-0 border-l border-border bg-panel/60 backdrop-blur flex flex-col">
      <div className="h-11 shrink-0 flex items-center px-3 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Inspector</h2>
        <div className="ml-auto text-[10px] font-mono text-muted-foreground">f {currentFrame}</div>
      </div>

      {!layer ? (
        <div className="p-4 text-xs text-muted-foreground">
          Select a layer to edit its transform, opacity, blend mode and color.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-4">
          <div className="text-xs font-semibold truncate">{layer.name}</div>

          <Section title="Transform">
            <Row>
              <NumField label="X" value={layer.x} kf={hasKf("x")} onKf={() => toggleKf("x")} onChange={(v) => updateLayer(layer.id, { x: v })} />
              <NumField label="Y" value={layer.y} kf={hasKf("y")} onKf={() => toggleKf("y")} onChange={(v) => updateLayer(layer.id, { y: v })} />
            </Row>
            <Row>
              <NumField label="Scale X" value={layer.scaleX} step={0.01} kf={hasKf("scaleX")} onKf={() => toggleKf("scaleX")} onChange={(v) => updateLayer(layer.id, { scaleX: v })} />
              <NumField label="Scale Y" value={layer.scaleY} step={0.01} kf={hasKf("scaleY")} onKf={() => toggleKf("scaleY")} onChange={(v) => updateLayer(layer.id, { scaleY: v })} />
            </Row>
            <Row>
              <NumField label="Rotation°" value={layer.rotation} kf={hasKf("rotation")} onKf={() => toggleKf("rotation")} onChange={(v) => updateLayer(layer.id, { rotation: v })} />
              <div />
            </Row>
          </Section>

          <Section title="Anchor Point">
            <Row>
              <NumField label="Anchor X" value={layer.anchorX} step={0.01} kf={hasKf("anchorX")} onKf={() => toggleKf("anchorX")} onChange={(v) => updateLayer(layer.id, { anchorX: v })} />
              <NumField label="Anchor Y" value={layer.anchorY} step={0.01} kf={hasKf("anchorY")} onKf={() => toggleKf("anchorY")} onChange={(v) => updateLayer(layer.id, { anchorY: v })} />
            </Row>
            <AnchorGrid layer={layer} onSet={(x, y) => updateLayer(layer.id, { anchorX: x, anchorY: y })} />
          </Section>

          <Section title="Opacity" trailing={<KfDot on={hasKf("opacity")} onClick={() => toggleKf("opacity")} />}>
            <Slider value={layer.opacity} min={0} max={1} step={0.01} onChange={(v) => updateLayer(layer.id, { opacity: v })} />
          </Section>

          <Section title="Blend Mode">
            <div className="grid grid-cols-2 gap-1">
              {BLENDS.map((b) => (
                <button
                  key={b}
                  onClick={() => updateLayer(layer.id, { blendMode: b })}
                  className={cn(
                    "text-[11px] py-1.5 rounded-md border border-border capitalize",
                    layer.blendMode === b ? "bg-primary/15 text-primary border-primary/40" : "bg-surface-2 hover:bg-surface-3 text-muted-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Color Adjustments">
            <p className="text-[11px] text-muted-foreground">Hue, saturation, brightness and curves will connect here in Phase 4.</p>
          </Section>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children, trailing }: { title: string; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
        {trailing}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function KfDot({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Remove keyframe at current frame" : "Add keyframe at current frame"}
      className={cn(
        "w-4 h-4 rounded-sm flex items-center justify-center transition",
        on ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
      )}
    >
      <Diamond className={cn("w-2.5 h-2.5", on && "fill-current drop-shadow-[0_0_4px_var(--primary-glow)]")} />
    </button>
  );
}

function NumField({ label, value, step = 1, onChange, kf, onKf }: { label: string; value: number; step?: number; onChange: (v: number) => void; kf?: boolean; onKf?: () => void }) {
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-between">
        <span>{label}</span>
        {onKf && <KfDot on={!!kf} onClick={onKf} />}
      </div>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn(
          "w-full h-8 px-2 rounded-md bg-surface-2 border text-xs font-mono focus:outline-none focus:bg-surface-3",
          kf ? "border-primary/50 focus:border-primary" : "border-border focus:border-primary/60",
        )}
      />
    </label>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Value</span>
        <span className="font-mono">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-(--color-primary)"
      />
    </div>
  );
}

function AnchorGrid({ layer, onSet }: { layer: Layer; onSet: (x: number, y: number) => void }) {
  const points = [0, 0.5, 1];
  return (
    <div className="grid grid-cols-3 gap-1 p-1.5 rounded-md bg-surface-2 border border-border w-max">
      {points.flatMap((y) =>
        points.map((x) => {
          const active = Math.abs(layer.anchorX - x) < 0.01 && Math.abs(layer.anchorY - y) < 0.01;
          return (
            <button
              key={`${x}-${y}`}
              onClick={() => onSet(x, y)}
              className={cn(
                "w-4 h-4 rounded-sm border",
                active ? "bg-primary border-primary shadow-[0_0_8px_var(--primary-glow)]" : "bg-surface-3 border-border hover:border-primary/40",
              )}
            />
          );
        }),
      )}
    </div>
  );
}
