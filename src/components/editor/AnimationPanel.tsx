import { motion } from "framer-motion";
import { Sparkles, Zap, Trash2 } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { ANIMATION_PRESETS } from "@/services/animation/presets";
import { cn } from "@/lib/utils";

export function AnimationPanel() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const layers = useEditor((s) => s.project.layers);
  const applyPreset = useEditor((s) => s.applyAnimationPreset);
  const clearKeyframes = useEditor((s) => s.clearKeyframes);
  const currentFrame = useEditor((s) => s.currentFrame);
  const recording = useEditor((s) => s.recording);
  const toggleRecord = useEditor((s) => s.toggleRecord);

  const selected = layers.find((l) => l.id === selectedIds[0]);
  const disabled = !selected || selected.kind !== "image";
  const kfCount = selected
    ? Object.values(selected.keyframes ?? {}).reduce(
        (a, arr) => a + (arr?.length ?? 0),
        0,
      )
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-2/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold">Auto-record</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-5">
              <span>Edits become keyframes at frame</span>
            </div>{" "}
          </div>
          <button
            onClick={toggleRecord}
            className={cn(
              "h-7 px-2.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider transition inline-flex items-center gap-1.5",
              recording
                ? "bg-red-500/15 border-red-500/60 text-red-400"
                : "bg-surface-3 border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                recording ? "bg-red-500 animate-pulse" : "bg-muted-foreground",
              )}
            />
            {recording ? "On" : "Off"}
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 ml-48">
          <span className="inline-flex items-center justify-end w-12 rounded bg-surface-3 px-1.5 font-mono tabular-nums text-foreground">
            {currentFrame}
          </span>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ANIMATION_PRESETS.map((p) => (
            <motion.button
              key={p.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              disabled={disabled}
              onClick={() => selected && applyPreset(selected.id, p)}
              className={cn(
                "text-left rounded-lg border p-2.5 transition group relative overflow-hidden",
                disabled
                  ? "opacity-40 cursor-not-allowed border-border bg-surface-2/40"
                  : "border-border bg-surface-2/60 hover:border-primary/50 hover:bg-primary/5",
              )}
              title={p.description}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-accent" />
                <div className="text-xs font-semibold">{p.name}</div>
              </div>
              <div className="text-[10px] text-muted-foreground line-clamp-2">
                {p.description}
              </div>
              <div className="mt-1 text-[9px] font-mono text-muted-foreground">
                {p.durationFrames}f
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {selected && kfCount > 0 && (
        <div className="rounded-lg border border-border bg-surface-2/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{selected.name}</span>
            <span className="text-[10px] font-mono text-accent">
              {kfCount} keyframes
            </span>
          </div>
          <button
            onClick={() => clearKeyframes(selected.id)}
            className="w-full h-8 rounded-md border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-red-500/15"
          >
            <Trash2 className="w-3 h-3" /> Clear all keyframes
          </button>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-accent" />
          <div className="text-xs font-semibold">How it works</div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Turn on <span className="text-red-400 font-semibold">Rec</span>, move
          the playhead, then edit any transform, opacity or anchor in the
          Inspector. Each edit sets a keyframe. Right-click a keyframe on the
          timeline to change easing.
        </p>
      </div>
    </div>
  );
}
