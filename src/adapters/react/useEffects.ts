import { useSyncExternalStore } from "react";
import { EffectRegistry, type Effect } from "@/services/effects";

export function useEffectList(): Effect[] {
  return useSyncExternalStore(
    EffectRegistry.subscribe,
    () => EffectRegistry.list(),
    () => EffectRegistry.list(),
  );
}
