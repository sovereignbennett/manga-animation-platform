import { Wand2, Sparkles, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { useMagicCut } from "@/hooks/useMagicCut";
import { BODY_PART_LABELS } from "@/types/segmentation";
import { cn } from "@/lib/utils";

/**
 * Magic Cut panel — the user-facing surface for Phase 2 segmentation.
 * Owns nothing but presentation; all logic lives in useMagicCut.
 */
export function MagicCutPanel() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const layers = useEditor((s) => s.project.layers);
  const layer = layers.find((l) => selectedIds.includes(l.id) && l.kind === "image");
  const { state, run, reset } = useMagicCut();

  const running = state.stage === "running";
  const pct = Math.round(state.progress * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="text-xs font-semibold">Magic Cut</div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Auto-separate a character into rigged, animation-ready layers with suggested pivot points.
        </p>
      </div>

      {!layer ? (
        <EmptyHint />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border p-2">
            <div className="w-9 h-9 rounded-md checker-bg overflow-hidden shrink-0 border border-border">
              {layer.src && <img src={layer.src} alt="" className="w-full h-full object-contain" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs truncate">{layer.name}</div>
              <div className="text-[10px] text-muted-foreground">{Math.round(layer.width)}×{Math.round(layer.height)}</div>
            </div>
          </div>

          <button
            onClick={() => run(layer.id)}
            disabled={running}
            className={cn(
              "w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium",
              "bg-gradient-to-r from-primary to-accent text-primary-foreground",
              "shadow-[0_0_24px_-6px_var(--primary-glow)] hover:brightness-110 transition",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {running ? "Cutting…" : "Run Magic Cut"}
          </button>

          {running && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{state.message}</span>
                <span className="font-mono">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                First run downloads a ~20MB in-browser model, then hands off to the AI part detector.
              </p>
            </div>
          )}

          {state.stage === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-destructive">Magic Cut failed</div>
                <div className="text-[11px] text-muted-foreground break-words">{state.error}</div>
                <button className="mt-1 text-[11px] text-primary hover:underline" onClick={reset}>Dismiss</button>
              </div>
            </div>
          )}

          {state.stage === "done" && state.result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <div className="text-[11px] leading-tight">
                  <div className="font-medium text-foreground">Rigged into {state.result.parts.length} parts</div>
                  <div className="text-muted-foreground">
                    {(state.result.durationMs / 1000).toFixed(1)}s · {state.result.modelTag}
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-border bg-surface-2/60 p-2 space-y-1 max-h-52 overflow-y-auto scroll-thin">
                {state.result.parts.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="flex-1 truncate">{BODY_PART_LABELS[p.kind]}</span>
                    <span className="font-mono text-muted-foreground">{Math.round(p.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md bg-surface-2/50 border border-border p-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Hybrid pipeline: in-browser background removal + AI body-part detection.
          Providers are swappable — see <code className="text-accent">services/segmentation</code>.
        </p>
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <Wand2 className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground">
        Select an image layer to Magic Cut it into rigged parts.
      </p>
    </div>
  );
}
