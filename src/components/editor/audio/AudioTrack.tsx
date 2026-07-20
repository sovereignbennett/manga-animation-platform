import { useAudioStore, type AudioTrackState } from "@/store/audioStore";
import { Waveform } from "./Waveform";
import { BeatMarkers } from "./BeatMarkers";

export function AudioTrack({ track }: { track: AudioTrackState }) {
  const patch = useAudioStore((s) => s.patch);
  return (
    <div className="surface flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{track.name}</span>
        <span className="text-muted-foreground">{track.duration.toFixed(1)}s</span>
      </div>
      <Waveform peaks={track.peaks} />
      <BeatMarkers beats={track.beats} duration={track.duration} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={() => patch(track.id, { muted: !track.params.muted })} className="rounded px-1.5 py-0.5 hover:bg-surface-strong">
          {track.params.muted ? "unmute" : "mute"}
        </button>
        <span>Gain</span>
        <input type="range" min={0} max={2} step={0.01} value={track.params.gain}
          onChange={(e) => patch(track.id, { gain: parseFloat(e.target.value) })}
          className="flex-1 accent-[color:var(--color-primary)]" />
        <span className="w-8 tabular-nums text-right">{track.params.gain.toFixed(2)}</span>
      </div>
    </div>
  );
}
