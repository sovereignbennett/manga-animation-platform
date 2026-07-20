import { useMemo, useRef } from "react";
import { useTimelineStore } from "@/store/timelineStore";
import { TrackRow } from "./TrackRow";
import { Ruler } from "./Ruler";
import { Markers } from "./Markers";

export function TimelineView() {
  const snapshot = useTimelineStore((s) => s.snapshot);
  const playhead = useTimelineStore((s) => s.playhead);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalWidth = useMemo(() => snapshot.duration * snapshot.zoom + 200, [snapshot.duration, snapshot.zoom]);

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(snapshot.zoom * (1 - e.deltaY * 0.002));
    }
  };
  const onRulerClick = (e: React.MouseEvent) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    setPlayhead(Math.max(0, x / snapshot.zoom));
  };

  return (
    <div className="flex h-full flex-col panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Timeline</span>
          <span className="text-muted-foreground">{playhead.toFixed(2)}s / {snapshot.duration.toFixed(0)}s</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <button onClick={() => setZoom(snapshot.zoom * 0.85)} className="rounded px-1.5 hover:bg-surface-strong">−</button>
          <span className="w-14 text-center">{snapshot.zoom.toFixed(0)} px/s</span>
          <button onClick={() => setZoom(snapshot.zoom * 1.18)} className="rounded px-1.5 hover:bg-surface-strong">+</button>
        </div>
      </div>

      <div ref={scrollRef} onWheel={onWheel} className="relative flex-1 overflow-auto">
        <div style={{ width: totalWidth }} className="relative">
          <div onClick={onRulerClick} className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
            <Ruler duration={snapshot.duration} zoom={snapshot.zoom} />
          </div>
          <Markers markers={snapshot.markers} zoom={snapshot.zoom} />
          <div className="relative">
            {snapshot.tracks.map((t) => (
              <TrackRow key={t.id} track={t} clips={snapshot.clips.filter((c) => c.layerId === t.layerId)} zoom={snapshot.zoom} />
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: playhead * snapshot.zoom, backgroundColor: "var(--color-timeline-playhead)" }}
          />
        </div>
      </div>
    </div>
  );
}
