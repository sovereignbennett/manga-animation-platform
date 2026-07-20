import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Glow: Effect = {
  id: "glow", name: "Glow", category: "stylize",
  params: [
    { key: "color", label: "Color", kind: "color", default: "#ffffff" },
    { key: "intensity", label: "Intensity", kind: "number", min: 0, max: 4, step: 0.05, default: 1 },
    { key: "radius", label: "Radius", kind: "number", min: 0, max: 64, step: 1, default: 12 },
    { key: "threshold", label: "Threshold", kind: "number", min: 0, max: 1, step: 0.01, default: 0.4 },
  ],
};

EffectRegistry.register(Glow);
export default Glow;
