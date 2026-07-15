import { useState } from "react";
import { Download, ImageIcon, Film, FileImage, Grid3x3, Loader2 } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { exportPNG, exportVideo, exportGIF, exportSpriteSheet } from "@/services/export/exporters";
import { cn } from "@/lib/utils";

type Format = "png" | "pngTransparent" | "mp4" | "gif" | "spritesheet";

const FORMATS: { id: Format; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "png", label: "PNG", desc: "Current frame", icon: ImageIcon },
  { id: "pngTransparent", label: "PNG · Transparent", desc: "Current frame · no background", icon: FileImage },
  { id: "mp4", label: "MP4", desc: "Video clip (WebM fallback)", icon: Film },
  { id: "gif", label: "GIF", desc: "Looping · transparent", icon: Film },
  { id: "spritesheet", label: "Sprite Sheet", desc: "Grid PNG + JSON", icon: Grid3x3 },
];

export function ExportPanel() {
  const project = useEditor((s) => s.project);
  const currentFrame = useEditor((s) => s.currentFrame);
  const totalFrames = useEditor((s) => s.totalFrames);
  const fps = useEditor((s) => s.fps);
  const setCanvasSize = useEditor((s) => s.setCanvasSize);

  const [format, setFormat] = useState<Format>("mp4");
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(Math.min(90, totalFrames));
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const outW = Math.round(project.canvasWidth * scale);
  const outH = Math.round(project.canvasHeight * scale);

  const run = async () => {
    setBusy(true);
    setStatus("Preparing...");
    try {
      const filename = project.name.replace(/\s+/g, "-").toLowerCase();
      const onProgress = ({ stage, progress }: { stage: string; progress: number }) =>
        setStatus(`${stage} · ${Math.round(progress * 100)}%`);

      if (format === "png" || format === "pngTransparent") {
        await exportPNG({
          frame: currentFrame,
          width: outW,
          height: outH,
          transparent: format === "pngTransparent",
          filename: `${filename}-f${currentFrame}.png`,
        });
      } else if (format === "mp4") {
        await exportVideo({ from, to, fps, width: outW, height: outH, onProgress, filename });
      } else if (format === "gif") {
        await exportGIF({ from, to, fps, width: outW, height: outH, onProgress, filename });
      } else if (format === "spritesheet") {
        await exportSpriteSheet({ from, to, width: outW, height: outH, transparent: true, onProgress, filename });
      }
      setStatus("Done ✓");
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Format</div>
        <div className="space-y-1">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const active = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition",
                  active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-surface-2/40 hover:border-border-strong",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{f.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{f.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Canvas</div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumField label="Width" value={project.canvasWidth} onChange={(v) => setCanvasSize(v, project.canvasHeight)} />
          <NumField label="Height" value={project.canvasHeight} onChange={(v) => setCanvasSize(project.canvasWidth, v)} />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground w-14">Scale</label>
          <input type="range" min={0.25} max={2} step={0.25} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="text-[10px] font-mono w-14 text-right">{outW}×{outH}</span>
        </div>
      </div>

      {format !== "png" && format !== "pngTransparent" && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Frame range</div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumField label="From" value={from} onChange={setFrom} />
            <NumField label="To" value={to} onChange={setTo} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.max(0, to - from) + 1} frames · ~{(((to - from) + 1) / fps).toFixed(1)}s @ {fps}fps
          </p>
        </div>
      )}

      <button
        onClick={run}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold shadow-[0_0_20px_-6px_var(--primary-glow)] disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? "Exporting..." : "Export"}
      </button>

      {status && (
        <div className="rounded-md border border-border bg-surface-2/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {status}
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2 h-8">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 bg-transparent text-xs outline-none w-0 min-w-0 text-right font-mono"
      />
    </label>
  );
}
