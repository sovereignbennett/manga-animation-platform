import { useAudioStore } from "@/store/audioStore";
import { NumberField } from "@/components/editor";
import { GainSlider } from "./GainSlider";

export function AudioInspector() {
  const track = useAudioStore((s) => s.tracks[0]);
  const patch = useAudioStore((s) => s.patch);
  if (!track) return <div className="p-3 text-xs text-muted-foreground">No audio track.</div>;
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-xs font-semibold">{track.name}</div>
      <GainSlider
        gain={track.params.gain}
        muted={track.params.muted}
        onGain={(v) => patch(track.id, { gain: v })}
        onMute={(v) => patch(track.id, { muted: v })}
      />
      <NumberField label="Fade In"  min={0} max={5} step={0.05} value={track.params.fadeIn}  onChange={(v) => patch(track.id, { fadeIn: v })}  suffix="s" />
      <NumberField label="Fade Out" min={0} max={5} step={0.05} value={track.params.fadeOut} onChange={(v) => patch(track.id, { fadeOut: v })} suffix="s" />
    </div>
  );
}
