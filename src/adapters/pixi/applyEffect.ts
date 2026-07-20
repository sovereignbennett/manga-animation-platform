/**
 * Map an Effect id + params to concrete Pixi v8 filters. Extend this
 * file when you add a new effect that needs a Pixi renderer. The effect
 * definitions themselves live in `src/services/effects/` and stay
 * renderer-agnostic.
 */
import { BlurFilter, ColorMatrixFilter, type Container, type Filter } from "pixi.js";
import type { EffectParams } from "@/services/effects";
import { hexToNumber } from "@/utils/color";

export function buildFilter(effectId: string, params: EffectParams): Filter | null {
  switch (effectId) {
    case "motionBlur": {
      const distance = (params.distance as number) ?? 0;
      const f = new BlurFilter({ strength: distance });
      return f;
    }
    case "glow": {
      // Approximated glow via a soft blur + tint matrix.
      const radius = (params.radius as number) ?? 12;
      return new BlurFilter({ strength: radius / 2 });
    }
    case "shadow": {
      const blur = (params.blur as number) ?? 8;
      return new BlurFilter({ strength: blur / 4 });
    }
    case "chromatic": {
      const m = new ColorMatrixFilter();
      const k = (params.intensity as number) ?? 1;
      m.matrix = [
        1 + 0.05 * k, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1 + 0.05 * k, 0, 0,
        0, 0, 0, 1, 0,
      ] as unknown as ColorMatrixFilter["matrix"];
      return m;
    }
    default:
      return null;
  }
}

export function applyEffectStack(
  target: Container,
  stack: readonly { id: string; params: EffectParams }[],
): void {
  const filters: Filter[] = [];
  for (const { id, params } of stack) {
    const f = buildFilter(id, params);
    if (f) filters.push(f);
  }
  target.filters = filters;
  // Silence "unused var" for color helper — kept exported for palette effects.
  void hexToNumber;
}
