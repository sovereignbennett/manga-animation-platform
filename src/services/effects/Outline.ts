import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Outline: Effect = {
  id: "outline", name: "Outline", category: "stylize",
  params: [
    { key: "color", label: "Color", kind: "color", default: "#ffffff" },
    { key: "thickness", label: "Thickness", kind: "number", min: 0, max: 32, step: 0.5, default: 2 },
    { key: "quality", label: "Quality", kind: "number", min: 1, max: 10, step: 1, default: 4 },
  ],
};

EffectRegistry.register(Outline);
export default Outline;
