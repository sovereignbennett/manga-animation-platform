import { useEffect, useState } from "react";
import { AnimationClock, type ClockState } from "@/services/animation";
import { useRafLoop } from "@/hooks/useRafLoop";

/** Bind an AnimationClock to React with automatic RAF ticking. */
export function useAnimationClock(clock: AnimationClock): ClockState {
  const [state, setState] = useState<ClockState>(clock.snapshot);
  useEffect(() => clock.subscribe(setState), [clock]);
  useRafLoop((dt) => clock.tick(dt), true);
  return state;
}
