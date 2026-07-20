import { NumberField } from "@/components/editor";

export function GainSlider({ gain, muted, onGain, onMute }: {
  gain: number; muted: boolean;
  onGain: (v: number) => void; onMute: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onMute(!muted)} className="surface w-10 rounded-md px-2 py-1 text-[10px] uppercase">
        {muted ? "unmute" : "mute"}
      </button>
      <div className="flex-1">
        <NumberField label="Gain" min={0} max={2} step={0.01} value={gain} onChange={onGain} />
      </div>
    </div>
  );
}
