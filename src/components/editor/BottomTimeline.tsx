import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut, Diamond, Circle, Trash2 } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { ANIMATABLE_PROPS, type AnimatableProp, type EasingKind } from "@/types/animation";
import { EASING_LABELS } from "@/services/animation/easing";

const PROP_COLORS: Record<AnimatableProp, string> = {
  x: "text-cyan-400",
  y: "text-cyan-400",
  scaleX: "text-fuchsia-400",
  scaleY: "text-fuchsia-400",
  rotation: "text-amber-400",
  opacity: "text-emerald-400",
  anchorX: "text-sky-400",
  anchorY: "text-sky-400",
};

export function BottomTimeline() {
  const playing = useEditor((s) => s.playing);
  const currentFrame = useEditor((s) => s.currentFrame);
  const totalFrames = useEditor((s) => s.totalFrames);
  const fps = useEditor((s) => s.fps);
  const timelineZoom = useEditor((s) => s.timelineZoom);
  const recording = useEditor((s) => s.recording);
  const toggleRecord = useEditor((s) => s.toggleRecord);
  const play = useEditor((s) => s.play);
  const pause = useEditor((s) => s.pause);
  const setFrame = useEditor((s) => s.setFrame);
  const setTimelineZoom = useEditor((s) => s.setTimelineZoom);
  const allLayers = useEditor((s) => s.project.layers);
  const layers = allLayers.filter((l) => l.kind === "image");
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const removeKeyframe = useEditor((s) => s.removeKeyframe);
  const setKeyframeEasing = useEditor((s) => s.setKeyframeEasing);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ layerId: string; prop: AnimatableProp; frame: number; x: number; y: number } | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const step = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = t - lastRef.current;
      const framesToAdvance = Math.floor((dt / 1000) * fps);
      if (framesToAdvance > 0) {
        lastRef.current = t;
        const s = useEditor.getState();
        const next = s.currentFrame + framesToAdvance;
        s.setFrame(next >= s.totalFrames ? 0 : next);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastRef.current = 0; };
  }, [playing, fps]);

  const pxPerFrame = 6 * timelineZoom;
  const trackWidth = totalFrames * pxPerFrame;
  const timeStr = `${Math.floor(currentFrame / fps).toString().padStart(2, "0")}:${(currentFrame % fps).toString().padStart(2, "0")}`;

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  return (
    <div className="h-64 shrink-0 border-t border-border bg-panel/70 backdrop-blur flex flex-col" onClick={() => menu && setMenu(null)}>
      {/* transport */}
      <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-border">
        <div className="flex items-center gap-1">
          <button className="tool-btn" onClick={() => setFrame(0)} title="Start"><ChevronsLeft className="w-4 h-4" /></button>
          <button className="tool-btn" onClick={() => setFrame(currentFrame - 1)} title="Previous frame"><SkipBack className="w-4 h-4" /></button>
          <button
            className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-[0_0_18px_-4px_var(--primary-glow)] hover:brightness-110"
            onClick={() => (playing ? pause() : play())}
            title="Play / Pause (Space)"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button className="tool-btn" onClick={() => setFrame(currentFrame + 1)} title="Next frame"><SkipForward className="w-4 h-4" /></button>
          <button className="tool-btn" onClick={() => setFrame(totalFrames)} title="End"><ChevronsRight className="w-4 h-4" /></button>
        </div>

        <button
          onClick={toggleRecord}
          className={cn(
            "ml-1 h-8 px-2.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition",
            recording
              ? "bg-red-500/15 border-red-500/60 text-red-400 shadow-[0_0_14px_-4px_rgb(239,68,68)]"
              : "bg-surface-2 border-border text-muted-foreground hover:text-foreground",
          )}
          title="Toggle auto-record — mutations become keyframes at the current frame"
        >
          <Circle className={cn("w-2.5 h-2.5", recording ? "fill-red-500 text-red-500 animate-pulse" : "fill-current")} />
          Rec
        </button>

        <div className="ml-2 px-2.5 py-1 rounded-md bg-surface-2 border border-border font-mono text-xs">
          <span className="text-accent">{timeStr}</span>
          <span className="text-muted-foreground"> / {Math.floor(totalFrames / fps)}s</span>
          <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">{fps}fps</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom / 1.25)}><ZoomOut className="w-4 h-4" /></button>
          <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${((timelineZoom - 0.25) / 3.75) * 100}%` }} />
          </div>
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom * 1.25)}><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Track labels */}
        <div className="w-52 shrink-0 border-r border-border overflow-y-auto scroll-thin">
          <div className="h-6 border-b border-border bg-surface/40" />
          {layers.length === 0 ? (
            <div className="p-3 text-[11px] text-muted-foreground">No layers to animate.</div>
          ) : layers.map((l) => {
            const isOpen = expanded.has(l.id);
            const animatedProps = ANIMATABLE_PROPS.filter((p) => (l.keyframes?.[p]?.length ?? 0) > 0);
            return (
              <div key={l.id}>
                <div
                  onClick={() => { select([l.id]); toggleExpand(l.id); }}
                  className={cn(
                    "h-9 px-3 flex items-center gap-2 text-xs cursor-pointer border-b border-border/50",
                    selectedIds.includes(l.id) ? "bg-primary/10 text-foreground" : "hover:bg-surface-2 text-muted-foreground",
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full transition-transform", isOpen ? "bg-primary scale-125" : "bg-accent")} />
                  <span className="truncate flex-1">{l.name}</span>
                  {animatedProps.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-mono">{animatedProps.length}</span>
                  )}
                </div>
                {isOpen && animatedProps.map((prop) => (
                  <div key={prop} className="h-7 px-3 pl-6 flex items-center gap-2 text-[10px] font-mono text-muted-foreground border-b border-border/30 bg-surface/20">
                    <Diamond className={cn("w-2.5 h-2.5", PROP_COLORS[prop])} />
                    <span>{prop}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Timeline body */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto scroll-thin relative">
          <div style={{ width: trackWidth, minWidth: "100%" }} className="relative">
            {/* Ruler */}
            <div className="sticky top-0 z-10 h-6 bg-surface/70 backdrop-blur border-b border-border relative">
              {Array.from({ length: Math.floor(totalFrames / fps) + 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0" style={{ left: i * fps * pxPerFrame }}>
                  <div className="h-full w-px bg-border-strong" />
                  <div className="absolute left-1 top-0.5 text-[10px] font-mono text-muted-foreground">{i}s</div>
                </div>
              ))}
              {Array.from({ length: totalFrames + 1 }).map((_, i) =>
                i % fps === 0 ? null : (
                  <div key={i} className="absolute top-3 bottom-0 w-px bg-border/60" style={{ left: i * pxPerFrame }} />
                ),
              )}
            </div>

            {/* Tracks */}
            {layers.map((l, idx) => {
              const isOpen = expanded.has(l.id);
              const animatedProps = ANIMATABLE_PROPS.filter((p) => (l.keyframes?.[p]?.length ?? 0) > 0);
              const summary = animatedProps.flatMap((prop) =>
                (l.keyframes?.[prop] ?? []).map((k) => ({ prop, k })),
              );
              return (
                <div key={l.id}>
                  <div className={cn("h-9 border-b border-border/50 relative", idx % 2 && "bg-surface/30")}>
                    {summary.map(({ prop, k }, i) => (
                      <div
                        key={`${prop}-${k.frame}-${i}`}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                        style={{ left: k.frame * pxPerFrame }}
                        title={`${prop} @ ${k.frame} = ${k.value.toFixed(2)}`}
                        onClick={(e) => { e.stopPropagation(); setFrame(k.frame); }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setMenu({ layerId: l.id, prop, frame: k.frame, x: e.clientX, y: e.clientY });
                        }}
                      >
                        <Diamond className={cn("w-2.5 h-2.5 fill-current group-hover:scale-150 transition-transform", PROP_COLORS[prop])} />
                      </div>
                    ))}
                  </div>
                  {isOpen && animatedProps.map((prop) => (
                    <div key={prop} className="h-7 border-b border-border/30 relative bg-surface/10">
                      {/* Segment lines between adjacent keyframes to hint easing */}
                      {(l.keyframes?.[prop] ?? []).map((k, i, arr) => {
                        const next = arr[i + 1];
                        return (
                          <div key={`seg-${prop}-${k.frame}`}>
                            {next && (
                              <div
                                className={cn("absolute top-1/2 h-px opacity-60", PROP_COLORS[prop], "bg-current")}
                                style={{ left: k.frame * pxPerFrame, width: (next.frame - k.frame) * pxPerFrame }}
                              />
                            )}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                              style={{ left: k.frame * pxPerFrame }}
                              title={`${prop} @ ${k.frame} = ${k.value.toFixed(2)} · ${EASING_LABELS[k.easing]}`}
                              onClick={(e) => { e.stopPropagation(); setFrame(k.frame); }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setMenu({ layerId: l.id, prop, frame: k.frame, x: e.clientX, y: e.clientY });
                              }}
                            >
                              <Diamond className={cn("w-2.5 h-2.5 fill-current group-hover:scale-150 transition-transform", PROP_COLORS[prop])} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-20"
              style={{ left: currentFrame * pxPerFrame, boxShadow: "0 0 10px var(--primary-glow)" }}
            >
              <div className="absolute -top-0.5 -left-1.5 w-3 h-3 rotate-45 bg-primary" />
            </div>

            {/* Scrubber overlay (ruler only) */}
            <div
              className="absolute top-0 left-0 right-0 h-6 z-30 cursor-ew-resize"
              onMouseDown={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const setFromEvent = (ev: MouseEvent | React.MouseEvent) => {
                  const x = (ev as MouseEvent).clientX - rect.left;
                  setFrame(Math.round(x / pxPerFrame));
                };
                setFromEvent(e);
                const move = (ev: MouseEvent) => setFromEvent(ev);
                const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            />
          </div>
        </div>
      </div>

      {menu && (
        <div
          className="fixed z-50 rounded-lg border border-border bg-panel/95 backdrop-blur shadow-xl p-1 min-w-[180px]"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Easing</div>
          {(Object.keys(EASING_LABELS) as EasingKind[]).map((k) => (
            <button
              key={k}
              onClick={() => { setKeyframeEasing(menu.layerId, menu.prop, menu.frame, k); setMenu(null); }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:bg-primary/15"
            >
              {EASING_LABELS[k]}
            </button>
          ))}
          <div className="h-px my-1 bg-border" />
          <button
            onClick={() => { removeKeyframe(menu.layerId, menu.prop, menu.frame); setMenu(null); }}
            className="w-full text-left px-2 py-1 text-xs rounded text-red-400 hover:bg-red-500/10 inline-flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" /> Delete keyframe
          </button>
        </div>
      )}
    </div>
  );
}
