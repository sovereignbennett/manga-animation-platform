import { useMemo } from "react";
import { TransitionEngine, type TransitionState } from "@/services/transitions";

export function useTransition(presetId: string | null, progress: number): TransitionState {
  return useMemo(
    () => TransitionEngine.evaluate(presetId ?? "fade", progress),
    [presetId, progress],
  );
}
