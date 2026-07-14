import { useEditor, type BlendMode, type Layer } from "@/store/editorStore";
import { cn } from "@/lib/utils";

const BLENDS: BlendMode[] = ["normal", "multiply", "screen", "overlay", "add", "lighten", "darken"];

export function RightInspector() {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const updateLayer = useEditor((s) => s.updateLayer);
  const layer = project.layers.find((l) => l.id === selectedIds[0]);

  return (
    <aside className="w-[280px] shrink-0 border-l border-border bg-panel/60 backdrop-blur flex flex-col">
      <div className="h-11 shrink-0 flex items-center px-3 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Inspector
        </h2>
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
              <NumField
                label="X"
                value={layer.x}
                onChange={(v) => updateLayer(layer.id, { x: v })}
              />
              <NumField
                label="Y"
                value={layer.y}
                onChange={(v) => updateLayer(layer.id, { y: v })}
              />
            </Row>
            <Row>
              <NumField
                label="Scale X"
                value={layer.scaleX}
                step={0.01}
                onChange={(v) => updateLayer(layer.id, { scaleX: v })}
              />
              <NumField
                label="Scale Y"
                value={layer.scaleY}
                step={0.01}
                onChange={(v) => updateLayer(layer.id, { scaleY: v })}
              />
            </Row>
            <Row>
              <NumField
                label="Rotation°"
                value={layer.rotation}
                onChange={(v) => updateLayer(layer.id, { rotation: v })}
              />
              <div />
            </Row>
          </Section>

          <Section title="Anchor Point">
            <Row>
              <NumField
                label="Anchor X"
                value={layer.anchorX}
                step={0.01}
                onChange={(v) => updateLayer(layer.id, { anchorX: v })}
              />
              <NumField
                label="Anchor Y"
                value={layer.anchorY}
                step={0.01}
                onChange={(v) => updateLayer(layer.id, { anchorY: v })}
              />
            </Row>
            <AnchorGrid
              layer={layer}
              onSet={(x, y) => updateLayer(layer.id, { anchorX: x, anchorY: y })}
            />
          </Section>

          <Section title="Opacity">
            <Slider
              value={layer.opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateLayer(layer.id, { opacity: v })}
            />
          </Section>

          <Section title="Blend Mode">
            <div className="grid grid-cols-2 gap-1">
              {BLENDS.map((b) => (
                <button
                  key={b}
                  onClick={() => updateLayer(layer.id, { blendMode: b })}
                  className={cn(
                    "text-[11px] py-1.5 rounded-md border border-border capitalize",
                    layer.blendMode === b
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-surface-2 hover:bg-surface-3 text-muted-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Color Adjustments">
            <p className="text-[11px] text-muted-foreground">
              Hue, saturation, brightness and curves will connect here in Phase 4.
            </p>
          </Section>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-8 px-2 rounded-md bg-surface-2 border border-border text-xs font-mono focus:outline-none focus:border-primary/60 focus:bg-surface-3"
      />
    </label>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Value</span>
        <span className="font-mono">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
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
                active
                  ? "bg-primary border-primary shadow-[0_0_8px_var(--primary-glow)]"
                  : "bg-surface-3 border-border hover:border-primary/40",
              )}
            />
          );
        }),
      )}
    </div>
  );
}
