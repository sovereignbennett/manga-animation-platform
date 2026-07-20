import { noise1D } from "@/utils/prng";
import { EffectRegistry } from "./EffectRegistry";
import type { Effect } from "./EffectTypes";

const Wiggle: Effect = {
  id: "wiggle", name: "Wiggle", category: "distort",
  params: [
    { key: "amount", label: "Amount", kind: "number", min: 0, max: 200, step: 0.5, default: 20 },
    { key: "frequency", label: "Frequency", kind: "number", min: 0, max: 20, step: 0.05, default: 2 },
    { key: "seed", label: "Seed", kind: "number", min: 0, max: 9999, step: 1, default: 42 },
  ],
  compute(params, t) {
    const amt = params.amount as number;
    const freq = params.frequency as number;
    const seed = params.seed as number;
    return {
      dx: noise1D(t, seed, freq) * amt,
      dy: noise1D(t, seed ^ 0x9e37, freq) * amt,
    };
  },
};

EffectRegistry.register(Wiggle);
export default Wiggle;
