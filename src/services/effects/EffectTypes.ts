/**
 * Effect plugin contract. Every effect is a single file that exports a
 * default `Effect` and self-registers with `EffectRegistry`.
 */
export interface EffectParamSpec {
  key: string;
  label: string;
  kind: "number" | "color" | "boolean" | "vec2";
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean | [number, number];
}

export type EffectParams = Record<string, number | string | boolean | [number, number]>;

/**
 * Renderer-agnostic effect. `apply` receives an opaque target and the
 * evaluated params. Adapters (see `adapters/pixi/applyEffect.ts`)
 * translate `id + params` into concrete renderer state — effects
 * themselves stay pure.
 */
export interface Effect {
  id: string;
  name: string;
  category: "stylize" | "blur" | "distort" | "generate" | "color";
  params: readonly EffectParamSpec[];
  /** Compute pure output (arbitrary shape). Adapters do the rendering. */
  compute?: (params: EffectParams, timeSeconds: number) => Record<string, unknown>;
}

export const defaultsOf = (effect: Effect): EffectParams => {
  const out: EffectParams = {};
  for (const p of effect.params) out[p.key] = p.default;
  return out;
};
