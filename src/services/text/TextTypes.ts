export interface TextShadow { color: string; blur: number; offsetX: number; offsetY: number }
export interface TextGlow { color: string; blur: number; intensity: number }
export interface TextStroke { color: string; width: number }
export interface TextGradient {
  type: "linear" | "radial";
  angle: number; // degrees, linear only
  stops: { offset: number; color: string }[];
}

export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;   // 100..900
  letterSpacing: number;
  lineHeight: number;   // multiplier
  align: TextAlign;
  color: string;
  gradient?: TextGradient;
  stroke?: TextStroke;
  shadow?: TextShadow;
  glow?: TextGlow;
  /** Variable-font axes: { wght: 700, wdth: 100, opsz: 32, slnt: -8 } */
  variableAxes?: Record<string, number>;
}

export interface TextBlock {
  id: string;
  text: string;
  style: TextStyle;
}
