import { useState } from "react";
import { useRafLoop } from "@/hooks/useRafLoop";
import { useResolvedShake } from "@/store/shakesStore";
import { ShakeEngine } from "@/services/shakes";

/** Small square that continuously reflects the selected shake preset. */
export function ShakePreview() {
  const preset = useResolvedShake();
  const [t, setT] = useState(0);
  useRafLoop((dt) => setT((v) => v + dt), true);

  const sample = preset
    ? ShakeEngine.sample(preset.params, t)
    : { x: 0, y: 0, rotation: 0, scale: 0 };

  return (
    <div className="relative flex h-32 items-center justify-center overflow-hidden surface">
      <div
        className="h-14 w-14 rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-accent)] shadow-lg"
        style={{
          transform: `translate(${sample.x}px, ${sample.y}px) rotate(${sample.rotation}rad) scale(${1 + sample.scale})`,
        }}
      />
    </div>
  );
}
