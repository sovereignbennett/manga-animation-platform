import type { Clip } from "@/types";
import type { Track } from "@/services/timeline";
import { ClipBlock } from "./ClipBlock";

export function TrackRow({ track, clips, zoom }: { track: Track; clips: readonly Clip[]; zoom: number }) {
  return (
    <div className="relative border-b border-border/60" style={{ height: track.height }}>
      <div className="pointer-events-none sticky left-0 z-[1] flex h-full w-40 items-center gap-2 border-r border-border bg-panel/95 px-3 text-xs backdrop-blur">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: track.color }} />
        <span className="truncate font-medium">{track.kind.toUpperCase()}</span>
      </div>
      <div className="absolute inset-0" style={{ paddingLeft: 160 }}>
        {clips.map((c) => (
          <ClipBlock key={c.id} clip={c} zoom={zoom} color={track.color} />
        ))}
      </div>
    </div>
  );
}
