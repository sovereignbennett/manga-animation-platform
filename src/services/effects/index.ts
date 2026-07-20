/**
 * Public API for the Effects feature.
 * Importing this barrel triggers the self-registration side-effects of
 * every built-in effect.
 */
export { EffectRegistry } from "./EffectRegistry";
export { defaultsOf } from "./EffectTypes";
export type { Effect, EffectParams, EffectParamSpec } from "./EffectTypes";

// Register built-ins (side-effect imports).
import "./Glow";
import "./MotionBlur";
import "./Chromatic";
import "./Shadow";
import "./Outline";
import "./Distort";
import "./Wiggle";
import "./Repeat";
