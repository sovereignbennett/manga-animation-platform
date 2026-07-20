import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Distort: Effect = {
  id: "distort", name: "Distort", category: "distort",
  params: [
    { key: "amplitude", label: "Amplitude", kind: "number", min: 0, max: 64, step: 0.5, default: 8 },
    { key: "frequency", label: "Frequency", kind: "number", min: 0, max: 32, step: 0.1, default: 4 },
    { key: "speed", label: "Speed", kind: "number", min: 0, max: 8, step: 0.05, default: 1 },
    { key: "axis", label: "Vertical", kind: "boolean", default: false },
  ],
  compute(params, t) {
    const amp = params.amplitude as number;
    const freq = params.frequency as number;
    const speed = params.speed as number;
    return { phase: t * speed, amp, freq };
  },
};

EffectRegistry.register(Distort);
export default Distort;
