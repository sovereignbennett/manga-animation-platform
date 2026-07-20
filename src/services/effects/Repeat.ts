import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Repeat: Effect = {
  id: "repeat", name: "Repeat", category: "generate",
  params: [
    { key: "count", label: "Count", kind: "number", min: 1, max: 32, step: 1, default: 5 },
    { key: "offset", label: "Offset", kind: "vec2", default: [40, 0] },
    { key: "rotationStep", label: "Rotation Step", kind: "number", min: -180, max: 180, step: 1, default: 0 },
    { key: "scaleStep", label: "Scale Step", kind: "number", min: 0, max: 2, step: 0.01, default: 0.95 },
    { key: "opacityStep", label: "Opacity Step", kind: "number", min: 0, max: 1, step: 0.01, default: 0.85 },
  ],
};

EffectRegistry.register(Repeat);
export default Repeat;
