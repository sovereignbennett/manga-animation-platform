import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Shadow: Effect = {
  id: "shadow", name: "Drop Shadow", category: "stylize",
  params: [
    { key: "color", label: "Color", kind: "color", default: "#000000" },
    { key: "offset", label: "Offset", kind: "vec2", default: [4, 4] },
    { key: "blur", label: "Blur", kind: "number", min: 0, max: 64, step: 1, default: 8 },
    { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.01, default: 0.6 },
  ],
};

EffectRegistry.register(Shadow);
export default Shadow;
