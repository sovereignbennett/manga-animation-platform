import type { TextStyle } from "./TextTypes";
import { GradientResolver } from "./GradientResolver";

/**
 * TextEngine — turns a style into renderer-agnostic descriptors. Two
 * outputs are provided: a CSS style bag (for DOM/HTML) and a Pixi
 * TextStyle-shaped descriptor (consumed by the Pixi adapter).
 */
export const TextEngine = {
  toCssStyle(style: TextStyle): Record<string, string | number> {
    const css: Record<string, string | number> = {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      fontWeight: style.fontWeight,
      letterSpacing: `${style.letterSpacing}px`,
      lineHeight: style.lineHeight,
      textAlign: style.align,
      color: style.color,
    };
    if (style.stroke) {
      css.WebkitTextStroke = `${style.stroke.width}px ${style.stroke.color}`;
    }
    if (style.shadow) {
      const sh = style.shadow;
      const list = [`${sh.offsetX}px ${sh.offsetY}px ${sh.blur}px ${sh.color}`];
      if (style.glow) list.push(`0 0 ${style.glow.blur}px ${style.glow.color}`);
      css.textShadow = list.join(", ");
    } else if (style.glow) {
      css.textShadow = `0 0 ${style.glow.blur}px ${style.glow.color}`;
    }
    if (style.gradient) {
      css.background = GradientResolver.toCss(style.gradient);
      css.WebkitBackgroundClip = "text";
      css.color = "transparent";
    }
    if (style.variableAxes) {
      css.fontVariationSettings = Object.entries(style.variableAxes)
        .map(([k, v]) => `"${k}" ${v}`)
        .join(", ");
    }
    return css;
  },
  toPixiStyle(style: TextStyle) {
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: String(style.fontWeight),
      letterSpacing: style.letterSpacing,
      lineHeight: style.fontSize * style.lineHeight,
      align: style.align === "justify" ? "left" : style.align,
      fill: style.gradient?.stops.map((s) => s.color) ?? style.color,
      stroke: style.stroke ? { color: style.stroke.color, width: style.stroke.width } : undefined,
      dropShadow: style.shadow
        ? {
            color: style.shadow.color,
            blur: style.shadow.blur,
            distance: Math.hypot(style.shadow.offsetX, style.shadow.offsetY),
            angle: Math.atan2(style.shadow.offsetY, style.shadow.offsetX),
            alpha: 1,
          }
        : undefined,
    };
  },
};
