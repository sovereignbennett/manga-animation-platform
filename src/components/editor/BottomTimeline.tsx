import { useEffect, useRef, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Diamond,
  EyeOff,
  Lock,
  Pause,
  Play,
  Repeat2,
  SkipBack,
  SkipForward,
  Trash2,
  Film,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  getLayerEndFrame,
  getLayerStartFrame,
  useEditor,
  type Layer,
} from "@/store/editorStore";
import { cn } from "@/lib/utils";
import {
  ANIMATABLE_PROPS,
  type AnimatableProp,
  type EasingKind,
} from "@/types/animation";
import { EASING_LABELS } from "@/services/animation/easing";
import { SnapEngine } from "@/services/timeline";
import { useTimelineThumbnails } from "@/hooks/useTimelineThumbnails";

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

type DragMode = "move" | "trimStart" | "trimEnd" | "fadeIn" | "fadeOut";

interface DragState {
  mode: DragMode;
  layerId: string;
  startX: number;
  startFrame: number;
  endFrame: number;
  fadeInFrames: number;
  fadeOutFrames: number;
}

const formatFrameTime = (frame: number, fps: number) => {
  const safeFrame = Math.max(0, Math.round(frame));
  const seconds = Math.floor(safeFrame / fps);
  const f = safeFrame % fps;
  return `${seconds.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
};

export function BottomTimeline() {
  const playing = useEditor((s) => s.playing);
  const loopPlayback = useEditor((s) => s.loopPlayback);
  const previewPlaybackRate = useEditor((s) => s.previewPlaybackRate);
  const currentFrame = useEditor((s) => s.currentFrame);
  const totalFrames = useEditor((s) => s.totalFrames);
  const fps = useEditor((s) => s.fps);
  const timelineZoom = useEditor((s) => s.timelineZoom);
  const recording = useEditor((s) => s.recording);
  const toggleRecord = useEditor((s) => s.toggleRecord);
  const play = useEditor((s) => s.play);
  const pause = useEditor((s) => s.pause);
  const toggleLoopPlayback = useEditor((s) => s.toggleLoopPlayback);
  const setPreviewPlaybackRate = useEditor((s) => s.setPreviewPlaybackRate);
  const setFrame = useEditor((s) => s.setFrame);
  const setTimelineZoom = useEditor((s) => s.setTimelineZoom);
  const allLayers = useEditor((s) => s.project.layers);
  const layers = allLayers.filter((l) => l.kind === "image");
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const updateLayer = useEditor((s) => s.updateLayer);
  const pushHistory = useEditor((s) => s.pushHistory);
  const removeKeyframe = useEditor((s) => s.removeKeyframe);
  const setKeyframeEasing = useEditor((s) => s.setKeyframeEasing);

  const [menu, setMenu] = useState<{
    layerId: string;
    prop: AnimatableProp;
    frame: number;
    x: number;
    y: number;
  } | null>(null);
  const [snapGuideFrame, setSnapGuideFrame] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const step = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = t - lastRef.current;
      const framesToAdvance = Math.floor((dt / 1000) * fps * previewPlaybackRate);
      if (framesToAdvance > 0) {
        lastRef.current = t;
        const s = useEditor.getState();
        const next = s.currentFrame + framesToAdvance;
        if (next >= s.totalFrames) {
          if (s.loopPlayback) {
            s.setFrame(0);
          } else {
            s.setFrame(s.totalFrames);
            s.pause();
          }
        } else {
          s.setFrame(next);
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [playing, fps, previewPlaybackRate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;
      event.preventDefault();
      const s = useEditor.getState();
      if (s.playing) s.pause();
      else s.play();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pxPerFrame = 6 * timelineZoom;
  const trackWidth = Math.max(totalFrames * pxPerFrame, 1);
  const totalDuration = `${Math.ceil(totalFrames / fps)}s`;

  const snapFrame = (
    candidateFrame: number,
    layerId: string,
    movingDuration?: number,
  ): { frame: number; guide: number | null } => {
    const otherEdges = layers
      .filter((layer) => layer.id !== layerId)
      .flatMap((layer) => [
        getLayerStartFrame(layer) / fps,
        getLayerEndFrame(layer, totalFrames) / fps,
      ]);
    const points = SnapEngine.gather({
      playhead: currentFrame / fps,
      clipEdges: [0, totalFrames / fps, ...otherEdges],
    });
    const result = SnapEngine.snap(candidateFrame / fps, points, 4 / fps);
    if (result.snapped) return { frame: Math.round(result.time * fps), guide: Math.round(result.time * fps) };

    if (movingDuration != null) {
      const endResult = SnapEngine.snap((candidateFrame + movingDuration) / fps, points, 4 / fps);
      if (endResult.snapped) {
        const snappedEnd = Math.round(endResult.time * fps);
        return { frame: snappedEnd - movingDuration, guide: snappedEnd };
      }
    }
    return { frame: candidateFrame, guide: null };
  };

  const updateDrag = (event: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dxFrames = Math.round((event.clientX - drag.startX) / pxPerFrame);
    const duration = drag.endFrame - drag.startFrame;
    const maxStart = Math.max(0, totalFrames - duration);

    if (drag.mode === "move") {
      const snapped = snapFrame(
        Math.max(0, Math.min(maxStart, drag.startFrame + dxFrames)),
        drag.layerId,
        duration,
      );
      const startFrame = Math.max(0, Math.min(maxStart, snapped.frame));
      updateLayer(drag.layerId, { startFrame, endFrame: startFrame + duration });
      setSnapGuideFrame(snapped.guide);
      return;
    }

    if (drag.mode === "trimStart") {
      const snapped = snapFrame(
        Math.max(0, Math.min(drag.endFrame - 1, drag.startFrame + dxFrames)),
        drag.layerId,
      );
      updateLayer(drag.layerId, {
        startFrame: Math.max(0, Math.min(drag.endFrame - 1, snapped.frame)),
      });
      setSnapGuideFrame(snapped.guide);
      return;
    }

    if (drag.mode === "trimEnd") {
      const snapped = snapFrame(
        Math.max(drag.startFrame + 1, Math.min(totalFrames, drag.endFrame + dxFrames)),
        drag.layerId,
      );
      updateLayer(drag.layerId, {
        endFrame: Math.max(drag.startFrame + 1, Math.min(totalFrames, snapped.frame)),
      });
      setSnapGuideFrame(snapped.guide);
      return;
    }

    if (drag.mode === "fadeIn") {
      updateLayer(drag.layerId, {
        fadeInFrames: Math.max(0, Math.min(duration - 1, drag.fadeInFrames + dxFrames)),
      });
      return;
    }

    updateLayer(drag.layerId, {
      fadeOutFrames: Math.max(0, Math.min(duration - 1, drag.fadeOutFrames - dxFrames)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
    setSnapGuideFrame(null);
    window.removeEventListener("mousemove", updateDrag);
    window.removeEventListener("mouseup", endDrag);
  };

  const beginDrag = (event: React.MouseEvent, layer: Layer, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    if (layer.locked) return;
    select([layer.id]);
    pushHistory();
    const startFrame = getLayerStartFrame(layer);
    const endFrame = getLayerEndFrame(layer, totalFrames);
    dragRef.current = {
      mode,
      layerId: layer.id,
      startX: event.clientX,
      startFrame,
      endFrame,
      fadeInFrames: Math.max(0, Math.round(layer.fadeInFrames ?? 0)),
      fadeOutFrames: Math.max(0, Math.round(layer.fadeOutFrames ?? 0)),
    };
    window.addEventListener("mousemove", updateDrag);
    window.addEventListener("mouseup", endDrag);
  };

  return (
    <div className="h-64 shrink-0 border-t border-border bg-panel/70 backdrop-blur flex flex-col" onClick={() => menu && setMenu(null)}>
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
          <button
            className={cn("tool-btn", loopPlayback && "tool-btn-active text-primary")}
            onClick={toggleLoopPlayback}
            title={loopPlayback ? "Loop on" : "Loop off"}
          >
            <Repeat2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={toggleRecord}
          className={cn(
            "ml-1 h-8 px-2.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition",
            recording
              ? "bg-red-500/15 border-red-500/60 text-red-400 shadow-[0_0_14px_-4px_rgb(239,68,68)]"
              : "bg-surface-2 border-border text-muted-foreground hover:text-foreground",
          )}
          title="Toggle auto-record - mutations become keyframes at the current frame"
        >
          <Circle className={cn("w-2.5 h-2.5", recording ? "fill-red-500 text-red-500 animate-pulse" : "fill-current")} />
          Rec
        </button>

        <div className="ml-2 px-2.5 py-1 rounded-md bg-surface-2 border border-border font-mono text-xs">
          <span className="text-accent">{formatFrameTime(currentFrame, fps)}</span>
          <span className="text-muted-foreground"> / {totalDuration}</span>
          <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">frame {currentFrame} · {fps}fps</span>
        </div>

        <div className="flex items-center gap-1">
          {[0.25, 0.5, 1, 2, 4].map((rate) => (
            <button
              key={rate}
              onClick={() => setPreviewPlaybackRate(rate)}
              className={cn(
                "h-7 px-1.5 rounded-md border text-[10px] font-mono",
                Math.abs(previewPlaybackRate - rate) < 0.01
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
              title="Preview playback speed"
            >
              {rate}x
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom / 1.25)} title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
          <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${((timelineZoom - 0.25) / 3.75) * 100}%` }} />
          </div>
          <button className="tool-btn" onClick={() => setTimelineZoom(timelineZoom * 1.25)} title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-56 shrink-0 border-r border-border overflow-y-auto scroll-thin">
          <div className="h-7 border-b border-border bg-surface/40 px-3 flex items-center text-[10px] uppercase tracking-wider text-muted-foreground">
            Layers
          </div>
          {layers.length === 0 ? (
            <div className="p-3 text-[11px] text-muted-foreground">No visual layers yet. Import images or video from Assets.</div>
          ) : layers.map((layer) => (
            <LayerLabel key={layer.id} layer={layer} selected={selectedIds.includes(layer.id)} onSelect={() => select([layer.id])} />
          ))}
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto scroll-thin relative">
          <div style={{ width: trackWidth, minWidth: "100%" }} className="relative">
            <Ruler totalFrames={totalFrames} fps={fps} pxPerFrame={pxPerFrame} setFrame={setFrame} />

            {layers.map((layer, idx) => (
              <TimelineRow
                key={layer.id}
                layer={layer}
                idx={idx}
                totalFrames={totalFrames}
                fps={fps}
                pxPerFrame={pxPerFrame}
                selected={selectedIds.includes(layer.id)}
                onSelect={() => select([layer.id])}
                onDragStart={beginDrag}
                onKeyframeMenu={(prop, frame, x, y) => setMenu({ layerId: layer.id, prop, frame, x, y })}
                setFrame={setFrame}
              />
            ))}

            {snapGuideFrame != null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-30"
                style={{ left: snapGuideFrame * pxPerFrame, boxShadow: "0 0 8px var(--color-accent)" }}
              />
            )}

            <div
              className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-40"
              style={{ left: currentFrame * pxPerFrame, boxShadow: "0 0 10px var(--primary-glow)" }}
            >
              <div className="absolute -top-0.5 -left-1.5 w-3 h-3 rotate-45 bg-primary" />
            </div>
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

function LayerLabel({ layer, selected, onSelect }: { layer: Layer; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "h-12 w-full px-3 flex items-center gap-2 text-left border-b border-border/50",
        selected ? "bg-primary/10 text-foreground" : "hover:bg-surface-2 text-muted-foreground",
      )}
    >
      <div className="w-8 h-8 rounded-md checker-bg overflow-hidden shrink-0 border border-border flex items-center justify-center">
        {layer.src ? (
          layer.mediaType === "video" ? <span className="text-[9px] font-semibold text-accent">VID</span> : <img src={layer.src} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[9px] text-muted-foreground">IMG</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{layer.name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          {layer.locked && <Lock className="w-3 h-3" />}
          {!layer.visible && <EyeOff className="w-3 h-3" />}
          <span>{layer.mediaType === "video" ? "Video" : layer.text ? "Text" : "Image"}</span>
        </div>
      </div>
    </button>
  );
}

function Ruler({ totalFrames, fps, pxPerFrame, setFrame }: {
  totalFrames: number;
  fps: number;
  pxPerFrame: number;
  setFrame: (frame: number) => void;
}) {
  return (
    <div className="sticky top-0 z-20 h-7 bg-surface/70 backdrop-blur border-b border-border relative">
      {Array.from({ length: Math.floor(totalFrames / fps) + 1 }).map((_, i) => (
        <div key={i} className="absolute top-0 bottom-0" style={{ left: i * fps * pxPerFrame }}>
          <div className="h-full w-px bg-border-strong" />
          <div className="absolute left-1 top-0.5 text-[10px] font-mono text-muted-foreground">{i}s</div>
        </div>
      ))}
      {Array.from({ length: totalFrames + 1 }).map((_, i) =>
        i % fps === 0 ? null : (
          <div key={i} className="absolute top-4 bottom-0 w-px bg-border/60" style={{ left: i * pxPerFrame }} />
        ),
      )}
      <div
        className="absolute inset-0 z-30 cursor-ew-resize"
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const setFromEvent = (ev: MouseEvent | React.MouseEvent) => {
            const x = "clientX" in ev ? ev.clientX - rect.left : 0;
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
  );
}

function TimelineRow({ layer, idx, totalFrames, fps, pxPerFrame, selected, onSelect, onDragStart, onKeyframeMenu, setFrame }: {
  layer: Layer;
  idx: number;
  totalFrames: number;
  fps: number;
  pxPerFrame: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (event: React.MouseEvent, layer: Layer, mode: DragMode) => void;
  onKeyframeMenu: (prop: AnimatableProp, frame: number, x: number, y: number) => void;
  setFrame: (frame: number) => void;
}) {
  const startFrame = getLayerStartFrame(layer);
  const endFrame = getLayerEndFrame(layer, totalFrames);
  const duration = endFrame - startFrame;
  const left = startFrame * pxPerFrame;
  const width = Math.max(28, duration * pxPerFrame);
  const thumbnailCount = Math.max(1, Math.min(12, Math.ceil(width / 96)));
  const videoThumbs = useTimelineThumbnails(
    layer.id,
    layer.src,
    thumbnailCount,
    layer.mediaType === "video",
  );
  const fadeIn = Math.max(0, Math.round(layer.fadeInFrames ?? 0));
  const fadeOut = Math.max(0, Math.round(layer.fadeOutFrames ?? 0));
  const keyframes = ANIMATABLE_PROPS.flatMap((prop) =>
    (layer.keyframes?.[prop] ?? [])
      .filter((kf) => kf.frame >= startFrame && kf.frame <= endFrame)
      .map((kf) => ({ prop, frame: kf.frame, value: kf.value })),
  );

  return (
    <div className={cn("h-12 border-b border-border/50 relative", idx % 2 && "bg-surface/30")}>
      <div
        className={cn(
          "absolute top-2 h-8 rounded-md border shadow-sm overflow-hidden select-none",
          selected ? "border-primary bg-primary/20" : "border-border-strong bg-accent/15 hover:border-primary/40",
          layer.locked && "opacity-60 cursor-not-allowed",
        )}
        style={{ left, width }}
        onMouseDown={(e) => onDragStart(e, layer, "move")}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        title={`${layer.name}: f${startFrame}-f${endFrame} (${duration} frames / ${(duration / fps).toFixed(2)}s)`}
      >
        {layer.src && layer.mediaType !== "video" && (
          <div className="absolute inset-0 flex opacity-70">
            {Array.from({ length: thumbnailCount }).map((_, index) => (
              <img
                key={`${layer.id}-image-thumb-${index}`}
                src={layer.src}
                alt=""
                className="h-full min-w-20 flex-1 object-cover"
                draggable={false}
              />
            ))}
          </div>
        )}
        {layer.mediaType === "video" && videoThumbs.thumbnails.length > 0 && (
          <div className="absolute inset-0 flex">
            {videoThumbs.thumbnails.map((thumb, index) => (
              <img
                key={`${thumb}-${index}`}
                src={thumb}
                alt=""
                className="h-full min-w-20 flex-1 object-cover"
                draggable={false}
              />
            ))}
          </div>
        )}
        {layer.mediaType === "video" && videoThumbs.thumbnails.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-3/70 text-muted-foreground">
            <Film className="w-4 h-4" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/50" />
        <div
          className="absolute inset-y-0 left-0 z-30 w-3 cursor-ew-resize bg-primary/60 hover:bg-primary"
          onMouseDown={(e) => onDragStart(e, layer, "trimStart")}
          title="Trim start"
        />
        <div
          className="absolute inset-y-0 right-0 z-30 w-3 cursor-ew-resize bg-primary/60 hover:bg-primary"
          onMouseDown={(e) => onDragStart(e, layer, "trimEnd")}
          title="Trim end"
        />

        {fadeIn > 0 && <div className="absolute inset-y-0 left-0 bg-white/10" style={{ width: Math.min(width, fadeIn * pxPerFrame) }} />}
        {fadeOut > 0 && <div className="absolute inset-y-0 right-0 bg-black/20" style={{ width: Math.min(width, fadeOut * pxPerFrame) }} />}

        <div
          className="absolute top-1 bottom-1 z-20 w-2 cursor-ew-resize rounded-sm border-r border-white/60 bg-white/10"
          style={{ left: Math.min(width - 18, Math.max(14, fadeIn * pxPerFrame)) }}
          onMouseDown={(e) => onDragStart(e, layer, "fadeIn")}
          title={`Fade in: ${fadeIn} frames`}
        />
        <div
          className="absolute top-1 bottom-1 z-20 w-2 -translate-x-full cursor-ew-resize rounded-sm border-l border-white/60 bg-white/10"
          style={{ left: Math.max(18, Math.min(width - 14, width - fadeOut * pxPerFrame)) }}
          onMouseDown={(e) => onDragStart(e, layer, "fadeOut")}
          title={`Fade out: ${fadeOut} frames`}
        />

        <div className="pointer-events-none flex h-full items-center gap-2 px-3 text-xs">
          <span className="truncate font-medium text-foreground">{layer.name}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {startFrame}-{endFrame}
          </span>
        </div>

        {keyframes.map(({ prop, frame, value }, i) => (
          <button
            key={`${prop}-${frame}-${i}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
            style={{ left: (frame - startFrame) * pxPerFrame }}
            title={`${prop} @ ${frame} = ${value.toFixed(2)}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setFrame(frame); }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onKeyframeMenu(prop, frame, e.clientX, e.clientY);
            }}
          >
            <Diamond className={cn("w-2.5 h-2.5 fill-current group-hover:scale-150 transition-transform", PROP_COLORS[prop])} />
          </button>
        ))}
      </div>
    </div>
  );
}
