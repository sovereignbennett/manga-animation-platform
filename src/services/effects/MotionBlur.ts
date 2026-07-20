import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const MotionBlur: Effect = {
  id: "motionBlur", name: "Motion Blur", category: "blur",
  params: [
    { key: "angle", label: "Angle", kind: "number", min: -180, max: 180, step: 1, default: 0 },
    { key: "distance", label: "Distance", kind: "number", min: 0, max: 64, step: 0.5, default: 8 },
    { key: "samples", label: "Samples", kind: "number", min: 2, max: 32, step: 1, default: 12 },
  ],
};

EffectRegistry.register(MotionBlur);
export default MotionBlur;
