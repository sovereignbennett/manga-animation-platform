/**
 * Public API for the Shake feature.
 * Framework-free. Consumers use these named exports; nothing else is public.
 */
export { ShakeEngine } from "./ShakeEngine";
export { ShakeRegistry } from "./ShakeRegistry";
export { BUILTIN_SHAKES } from "./ShakePresets";
export type { ShakePreset, ShakeParams, ShakeSample, ShakeProfile } from "./ShakeTypes";
