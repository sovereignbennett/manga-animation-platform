import { useRef, useState } from "react";
import type { Clip } from "@/types";
import { usePointerDrag } from "@/hooks/usePointerDrag";
import { useTimelineStore } from "@/store/timelineStore";
import { useSelectionStore } from "@/store/selectionStore";
import { SnapEngine } from "@/services/timeline";
import { TrackMath } from "@/services/timeline";

export function ClipBlock({ clip, zoom, color }: { clip: Clip; zoom: number; color: string }) {
  const moveClip = useTimelineStore((s) => s.moveClip);
  const trimClip = useTimelineStore((s) => s.trimClip);
  const select = useSelectionStore((s) => s.set);
  const allClips = useTimelineStore((s) => s.snapshot.clips);
  const [ghost, setGhost] = useState<number | null>(null);
  const originStart = useRef(clip.range.start);

  const snapPoints = SnapEngine.gather({
    clipEdges: TrackMath.clipEdges(allClips.filter((c) => c.id !== clip.id)),
  });

  const dragBody = usePointerDrag({
    onStart: () => { originStart.current = clip.range.start; setGhost(clip.range.start); },
    onMove: (s) => {
      const target = originStart.current + s.dx / zoom;
      const snapped = SnapEngine.snap(target, snapPoints, 6 / zoom).time;
      setGhost(snapped);
    },
    onEnd: () => {
      if (ghost != null) moveClip(clip.id, ghost - clip.range.start);
      setGhost(null);
    },
  });

  const startL = usePointerDrag({
    onMove: (s) => {
      const t = clip.range.start + s.dx / zoom;
      const snapped = SnapEngine.snap(t, snapPoints, 6 / zoom).time;
      trimClip(clip.id, "start", snapped);
    },
  });
  const endL = usePointerDrag({
    onMove: (s) => {
      const t = clip.range.end + s.dx / zoom;
      const snapped = SnapEngine.snap(t, snapPoints, 6 / zoom).time;
      trimClip(clip.id, "end", snapped);
    },
  });

  const left = (ghost ?? clip.range.start) * zoom;
  const width = TrackMath.rangeWidth(clip.range, zoom);
  const fadeInPx = (clip.fadeIn ?? 0) * zoom;
  const fadeOutPx = (clip.fadeOut ?? 0) * zoom;

  return (
    <div
      onPointerDown={(e) => { select("clip", clip.id); dragBody(e); }}
      className="absolute top-1 bottom-1 cursor-grab select-none rounded-md border border-black/25 shadow-md active:cursor-grabbing"
      style={{ left, width, background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 70%, black))` }}
      title={`${clip.range.start.toFixed(2)}s → ${clip.range.end.toFixed(2)}s`}
    >
      <div className="flex h-full items-center justify-between px-2 text-[10px] font-medium text-black/80">
        <span className="truncate">{clip.id}</span>
        <span>{(clip.range.end - clip.range.start).toFixed(2)}s</span>
      </div>
      {fadeInPx > 0 && (
        <div className="pointer-events-none absolute inset-y-0 left-0" style={{ width: fadeInPx, background: "linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0))" }} />
      )}
      {fadeOutPx > 0 && (
        <div className="pointer-events-none absolute inset-y-0 right-0" style={{ width: fadeOutPx, background: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.65))" }} />
      )}
      <div onPointerDown={(e) => { e.stopPropagation(); startL(e); }} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-white/25 hover:bg-white/60" />
      <div onPointerDown={(e) => { e.stopPropagation(); endL(e); }} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-white/25 hover:bg-white/60" />
      {ghost != null && (
        <div className="pointer-events-none absolute -top-1 left-0 rounded bg-black/70 px-1 text-[10px] text-white">
          {ghost.toFixed(2)}s
        </div>
      )}
    </div>
  );
}
