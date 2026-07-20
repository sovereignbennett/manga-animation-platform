/**
 * Apply a ShakeSample to a Pixi Container. Framework-free bridge.
 */
import type { Container } from "pixi.js";
import type { ShakeSample } from "@/services/shakes";

export const applyShake = (target: Container, sample: ShakeSample, base?: {
  x?: number; y?: number; rotation?: number; scale?: number;
}) => {
  target.x = (base?.x ?? 0) + sample.x;
  target.y = (base?.y ?? 0) + sample.y;
  target.rotation = (base?.rotation ?? 0) + sample.rotation;
  const s = (base?.scale ?? 1) + sample.scale;
  target.scale.set(s, s);
};
