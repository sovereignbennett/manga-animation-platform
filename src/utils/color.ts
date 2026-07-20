import type { RGBA } from "@/types";

export const hexToRgba = (hex: string, alpha = 1): RGBA => {
  const h = hex.replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h.padEnd(6, "0").slice(0, 6);
  const int = parseInt(v, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: alpha };
};

export const rgbaToHex = ({ r, g, b }: RGBA): string =>
  "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

export const hexToNumber = (hex: string): number => {
  const h = hex.replace("#", "");
  return parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
};
