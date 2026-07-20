import type { TextGradient } from "./TextTypes";

/** Turn a TextGradient descriptor into a plain CSS `background` value. */
export const GradientResolver = {
  toCss(g: TextGradient): string {
    const stops = g.stops
      .slice()
      .sort((a, b) => a.offset - b.offset)
      .map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
      .join(", ");
    return g.type === "linear"
      ? `linear-gradient(${g.angle}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  },
};
