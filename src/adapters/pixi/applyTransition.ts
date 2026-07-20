import type { Container } from "pixi.js";
import { TransitionEngine, type TransitionState } from "@/services/transitions";

/** Apply a transition preset at a given progress to a Pixi Container. */
export const applyTransition = (
  target: Container,
  presetId: string,
  progress: number,
): TransitionState => {
  const s = TransitionEngine.evaluate(presetId, progress);
  target.alpha = s.opacity;
  target.rotation = s.rotation;
  target.scale.set(s.scaleX, s.scaleY);
  target.x = s.translateX;
  target.y = s.translateY;
  return s;
};
