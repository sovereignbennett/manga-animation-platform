import type { BeatMarker } from "@/services/audio";

export function BeatMarkers({ beats, duration }: { beats?: readonly BeatMarker[]; duration: number }) {
  if (!beats || beats.length === 0) return null;
  return (
    <div className="relative h-2 w-full">
      {beats.map((b, i) => (
        <div
          key={i}
          className="absolute top-0 h-full w-px"
          style={{ left: `${(b.time / duration) * 100}%`, backgroundColor: "var(--color-accent)", opacity: 0.4 + b.strength * 0.6 }}
        />
      ))}
    </div>
  );
}
