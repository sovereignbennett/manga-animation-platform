/**
 * useShake — React binding for the pure ShakeEngine.
 * Returns the current sample for the given preset at the given time.
 */
import { useMemo } from "react";
import { ShakeEngine, ShakeRegistry, type ShakeSample } from "@/services/shakes";

export function useShake(presetId: string | null, timeSeconds: number): ShakeSample {
  return useMemo(() => {
    if (!presetId) return { x: 0, y: 0, rotation: 0, scale: 0 };
    const preset = ShakeRegistry.get(presetId);
    if (!preset) return { x: 0, y: 0, rotation: 0, scale: 0 };
    return ShakeEngine.sample(preset.params, timeSeconds);
  }, [presetId, timeSeconds]);
}
