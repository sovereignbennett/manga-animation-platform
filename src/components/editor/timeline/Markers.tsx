import type { Marker } from "@/types";

export function Markers({ markers, zoom }: { markers: readonly Marker[]; zoom: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-0 h-3">
      {markers.map((m) => (
        <div key={m.id} className="absolute -translate-x-1/2 text-[10px]" style={{ left: m.time * zoom }}>
          <div className="mx-auto h-2 w-2 rotate-45" style={{ backgroundColor: m.color ?? "var(--color-track-fx)" }} />
        </div>
      ))}
    </div>
  );
}
