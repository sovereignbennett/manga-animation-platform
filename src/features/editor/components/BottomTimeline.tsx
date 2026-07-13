import { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Diamond,
} from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";

export function BottomTimeline() {
  const playing = useEditor((s) => s.playing);
  const currentFrame = useEditor((s) => s.currentFrame);
  const totalFrames = useEditor((s) => s.totalFrames);
  const fps = useEditor((s) => s.fps);
  const timelineZoom = useEditor((s) => s.timelineZoom);
  const play = useEditor((s) => s.play);
  const pause = useEditor((s) => s.pause);
  const setFrame = useEditor((s) => s.setFrame);
  const setTimelineZoom = useEditor((s) => s.setTimelineZoom);
  const allLayers = useEditor((s) => s.project.layers);
  const layers = allLayers.filter((l) => l.kind === "image");
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);

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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [playing, fps]);

  const pxPerFrame = 6 * timelineZoom;
  const trackWidth = totalFrames * pxPerFrame;
  const timeStr = `${Math.floor(currentFrame / fps)
    .toString()
    .padStart(2, "0")}:${(currentFrame % fps).toString().padStart(2, "0")}`;

  return (
    <div className="h-56 shrink-0 border-t border-border bg-panel/70 backdrop-blur flex flex-col">
      {/* transport */}
      <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-border">
        <div className="flex items-center gap-1">
          <button className="tool-btn" onClick={() => setFrame(0)} title="Start">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            className="tool-btn"
            onClick={() => setFrame(currentFrame - 1)}
            title="Previous frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-[0_0_18px_-4px_var(--primary-glow)] hover:brightness-110"
            onClick={() => (playing ? pause() : play())}
            title="Play / Pause (Space)"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            className="tool-btn"
            onClick={() => setFrame(currentFrame + 1)}
            title="Next frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button className="tool-btn" onClick={() => setFrame(totalFrames)} title="End">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-2 px-2.5 py-1 rounded-md bg-surface-2 border border-border font-mono text-xs">
          <span className="text-accent">{timeStr}</span>
          <span className="text-muted-foreground"> / {Math.floor(totalFrames / fps)}s</span>
          <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            {fps}fps
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom / 1.25)}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${((timelineZoom - 0.25) / 3.75) * 100}%` }}
            />
          </div>
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom * 1.25)}>
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ruler + tracks */}
      <div className="flex-1 min-h-0 flex">
        {/* Track labels */}
        <div className="w-48 shrink-0 border-r border-border overflow-y-auto scroll-thin">
          <div className="h-6 border-b border-border bg-surface/40" />
          {layers.length === 0 ? (
            <div className="p-3 text-[11px] text-muted-foreground">No layers to animate.</div>
          ) : (
            layers.map((l) => (
              <div
                key={l.id}
                onClick={() => select([l.id])}
                className={cn(
                  "h-9 px-3 flex items-center gap-2 text-xs cursor-pointer border-b border-border/50",
                  selectedIds.includes(l.id)
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-surface-2 text-muted-foreground",
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="truncate">{l.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Timeline body */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto scroll-thin relative">
          <div style={{ width: trackWidth, minWidth: "100%" }} className="relative">
            {/* Ruler */}
            <div className="sticky top-0 z-10 h-6 bg-surface/70 backdrop-blur border-b border-border relative">
              {Array.from({ length: Math.floor(totalFrames / fps) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{ left: i * fps * pxPerFrame }}
                >
                  <div className="h-full w-px bg-border-strong" />
                  <div className="absolute left-1 top-0.5 text-[10px] font-mono text-muted-foreground">
                    {i}s
                  </div>
                </div>
              ))}
              {/* Sub ticks */}
              {Array.from({ length: totalFrames + 1 }).map((_, i) =>
                i % fps === 0 ? null : (
                  <div
                    key={i}
                    className="absolute top-3 bottom-0 w-px bg-border/60"
                    style={{ left: i * pxPerFrame }}
                  />
                ),
              )}
            </div>

            {/* Tracks */}
            {layers.map((l, idx) => (
              <div
                key={l.id}
                className={cn("h-9 border-b border-border/50 relative", idx % 2 && "bg-surface/30")}
              >
                {/* Sample keyframes (demo distribution) */}
                {[0, 30, 90, 180].map((f) => (
                  <div
                    key={f}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                    style={{ left: f * pxPerFrame }}
                    title={`Frame ${f}`}
                  >
                    <Diamond className="w-3 h-3 text-accent fill-accent group-hover:scale-125 transition-transform drop-shadow-[0_0_6px_var(--color-keyframe)]" />
                  </div>
                ))}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-20"
              style={{ left: currentFrame * pxPerFrame, boxShadow: "0 0 10px var(--primary-glow)" }}
            >
              <div className="absolute -top-0.5 -left-1.5 w-3 h-3 rotate-45 bg-primary" />
            </div>

            {/* Scrubber overlay */}
            <div
              className="absolute inset-0 z-30"
              onMouseDown={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const setFromEvent = (ev: MouseEvent | React.MouseEvent) => {
                  const x = (ev as MouseEvent).clientX - rect.left;
                  setFrame(Math.round(x / pxPerFrame));
                };
                setFromEvent(e);
                const move = (ev: MouseEvent) => setFromEvent(ev);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
