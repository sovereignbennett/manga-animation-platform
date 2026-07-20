import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Chromatic: Effect = {
  id: "chromatic", name: "Chromatic", category: "distort",
  params: [
    { key: "offsetR", label: "Red Offset", kind: "vec2", default: [4, 0] },
    { key: "offsetG", label: "Green Offset", kind: "vec2", default: [0, 0] },
    { key: "offsetB", label: "Blue Offset", kind: "vec2", default: [-4, 0] },
    { key: "intensity", label: "Intensity", kind: "number", min: 0, max: 4, step: 0.05, default: 1 },
  ],
};

EffectRegistry.register(Chromatic);
export default Chromatic;
