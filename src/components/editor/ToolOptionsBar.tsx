import { useEditor } from "@/store/editorStore";
import { useToolSettings } from "@/store/toolSettings";
import { SYSTEM_FONTS } from "@/services/text/renderText";
import { updateTextLayer } from "@/services/text/textLayer";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Contextual second row that swaps its contents based on the active tool.
 * Sits directly under TopToolbar and never re-mounts on tool change so
 * inputs keep focus while typing.
 */
export function ToolOptionsBar() {
  const tool = useEditor((s) => s.activeTool);
  const selectedIds = useEditor((s) => s.selectedIds);
  const layers = useEditor((s) => s.project.layers);
  const selectedTextLayer = layers.find((l) => l.id === selectedIds[0] && l.text);

  if (tool !== "brush" && tool !== "eraser" && tool !== "pen" && tool !== "text" && !selectedTextLayer) {
    return (
      <div className="h-9 shrink-0 border-b border-border bg-panel/40 backdrop-blur px-3 flex items-center text-[11px] text-muted-foreground">
        <span className="capitalize text-foreground/70 font-medium">{tool}</span>
        <span className="mx-2 text-border-strong">·</span>
        <span>Select a tool to see its options.</span>
      </div>
    );
  }

  return (
    <div className="h-11 shrink-0 border-b border-border bg-panel/60 backdrop-blur px-3 flex items-center gap-3 overflow-x-auto scroll-thin">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">
        {selectedTextLayer && tool !== "text" ? "Text" : tool}
      </span>
      <div className="w-px h-5 bg-border shrink-0" />
      {tool === "brush" && <BrushOptions />}
      {tool === "eraser" && <EraserOptions />}
      {tool === "pen" && <PenOptions />}
      {(tool === "text" || (selectedTextLayer && tool !== "brush" && tool !== "eraser" && tool !== "pen")) && (
        <TextOptions layerId={selectedTextLayer?.id} />
      )}
    </div>
  );
}

function BrushOptions() {
  const brush = useToolSettings((s) => s.brush);
  const setBrush = useToolSettings((s) => s.setBrush);
  const pushRecentColor = useToolSettings((s) => s.pushRecentColor);
  return (
    <>
      <NumSlider label="Size" value={brush.size} min={1} max={400} step={1} onChange={(v) => setBrush({ size: v })} suffix="px" />
      <NumSlider label="Opacity" value={brush.opacity} min={0} max={1} step={0.01} onChange={(v) => setBrush({ opacity: v })} suffix="" isPercent />
      <ColorInput
        color={brush.color}
        onChange={(c) => setBrush({ color: c })}
        onCommit={(c) => pushRecentColor(c)}
      />
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-1">Recent</span>
        {brush.recentColors.slice(0, 8).map((c) => (
          <button
            key={c}
            onClick={() => setBrush({ color: c })}
            className={cn(
              "w-5 h-5 rounded border border-border hover:scale-110 transition",
              brush.color.toLowerCase() === c.toLowerCase() && "ring-2 ring-primary",
            )}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
    </>
  );
}

function EraserOptions() {
  const eraser = useToolSettings((s) => s.eraser);
  const setEraser = useToolSettings((s) => s.setEraser);
  return (
    <>
      <NumSlider label="Size" value={eraser.size} min={1} max={400} step={1} onChange={(v) => setEraser({ size: v })} suffix="px" />
      <NumSlider label="Opacity" value={eraser.opacity} min={0} max={1} step={0.01} onChange={(v) => setEraser({ opacity: v })} isPercent />
    </>
  );
}

function PenOptions() {
  const pen = useToolSettings((s) => s.pen);
  const setPen = useToolSettings((s) => s.setPen);
  return (
    <>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={pen.closePath}
          onChange={(e) => setPen({ closePath: e.target.checked })}
          className="accent-[var(--color-primary)]"
        />
        Close path on commit
      </label>
      <span className="text-[10px] text-muted-foreground">
        Click to add anchors · <kbd className="px-1 rounded bg-surface-2">Enter</kbd> or double-click to commit · <kbd className="px-1 rounded bg-surface-2">Esc</kbd> to cancel
      </span>
    </>
  );
}

function TextOptions({ layerId }: { layerId?: string }) {
  const text = useToolSettings((s) => s.text);
  const setText = useToolSettings((s) => s.setText);
  const layers = useEditor((s) => s.project.layers);
  const layer = layerId ? layers.find((l) => l.id === layerId) : undefined;
  const active = layer?.text ?? text;

  const patch = (p: Parameters<typeof setText>[0]) => {
    if (layer && layer.text) updateTextLayer(layer.id, p);
    else setText(p);
  };

  return (
    <>
      <label className="flex items-center gap-1 text-[11px]">
        <span className="text-muted-foreground">Content</span>
        <input
          value={active.content}
          onChange={(e) => patch({ content: e.target.value })}
          className="w-40 h-7 px-2 rounded-md bg-surface-2 border border-border text-xs focus:outline-none focus:border-primary/60"
        />
      </label>
      <label className="flex items-center gap-1 text-[11px]">
        <span className="text-muted-foreground">Font</span>
        <select
          value={active.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          className="h-7 px-1.5 rounded-md bg-surface-2 border border-border text-xs focus:outline-none focus:border-primary/60"
        >
          {SYSTEM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <NumSlider label="Size" value={active.fontSize} min={8} max={512} step={1} onChange={(v) => patch({ fontSize: v })} suffix="px" />
      <div className="flex items-center gap-0.5">
        <IconToggle on={active.bold} onClick={() => patch({ bold: !active.bold })} title="Bold"><Bold className="w-3.5 h-3.5" /></IconToggle>
        <IconToggle on={active.italic} onClick={() => patch({ italic: !active.italic })} title="Italic"><Italic className="w-3.5 h-3.5" /></IconToggle>
        <IconToggle on={active.underline} onClick={() => patch({ underline: !active.underline })} title="Underline"><Underline className="w-3.5 h-3.5" /></IconToggle>
      </div>
      <div className="flex items-center gap-0.5">
        <IconToggle on={active.align === "left"} onClick={() => patch({ align: "left" })} title="Align left"><AlignLeft className="w-3.5 h-3.5" /></IconToggle>
        <IconToggle on={active.align === "center"} onClick={() => patch({ align: "center" })} title="Align center"><AlignCenter className="w-3.5 h-3.5" /></IconToggle>
        <IconToggle on={active.align === "right"} onClick={() => patch({ align: "right" })} title="Align right"><AlignRight className="w-3.5 h-3.5" /></IconToggle>
      </div>
      <ColorInput color={active.color} onChange={(c) => patch({ color: c })} />
      <NumSlider label="Tracking" value={active.letterSpacing} min={-10} max={40} step={0.5} onChange={(v) => patch({ letterSpacing: v })} suffix="px" />
      <NumSlider label="Leading" value={active.lineHeight} min={0.8} max={3} step={0.05} onChange={(v) => patch({ lineHeight: v })} />
    </>
  );
}

function IconToggle({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center border transition",
        on ? "bg-primary/15 text-primary border-primary/40" : "bg-surface-2 border-border text-muted-foreground hover:text-foreground hover:bg-surface-3",
      )}
    >
      {children}
    </button>
  );
}

function NumSlider({
  label, value, min, max, step, onChange, suffix = "", isPercent = false,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; isPercent?: boolean;
}) {
  const display = isPercent ? Math.round(value * 100) : Number(value.toFixed(2));
  return (
    <label className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 accent-[var(--color-primary)]"
      />
      <input
        type="number" min={min} max={max} step={step}
        value={display}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          if (!Number.isFinite(raw)) return;
          onChange(isPercent ? raw / 100 : raw);
        }}
        className="w-14 h-7 px-1.5 rounded-md bg-surface-2 border border-border text-xs font-mono focus:outline-none focus:border-primary/60"
      />
      {suffix && <span className="text-[10px] text-muted-foreground">{isPercent ? "%" : suffix}</span>}
    </label>
  );
}

function ColorInput({ color, onChange, onCommit }: { color: string; onChange: (c: string) => void; onCommit?: (c: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">Color</span>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        className="w-7 h-7 rounded-md bg-surface-2 border border-border cursor-pointer"
      />
      <input
        // type="text"
        value={color}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) onChange(v);
          else onChange(v); // let user type; validate visually via color input
        }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) onCommit?.(v);
        }}
        className="w-20 h-7 px-1.5 rounded-md bg-surface-2 border border-border text-[11px] font-mono uppercase focus:outline-none focus:border-primary/60"
      />
    </label>
  );
}
