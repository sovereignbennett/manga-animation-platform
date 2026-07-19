/**
 * Rasterize a text block to a PNG data URL. Text layers are stored the same
 * way image layers are (src + width + height) so they flow through Pixi,
 * effects, export and the mask tools with zero special-casing.
 */

export interface TextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number; // px
  lineHeight: number;    // multiplier (e.g. 1.2)
}

export const DEFAULT_TEXT_PROPS: TextProps = {
  content: "Chat",
  fontFamily: "Helvetica",
  fontSize: 96,
  bold: false,
  italic: false,
  underline: false,
  color: "#ffffff",
  align: "left",
  letterSpacing: 0,
  lineHeight: 1.2,
};

export const SYSTEM_FONTS = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Trebuchet MS",
];

function fontString(p: TextProps): string {
  const style = p.italic ? "italic " : "";
  const weight = p.bold ? "700 " : "400 ";
  return `${style}${weight}${p.fontSize}px "${p.fontFamily}", sans-serif`;
}

function measureLine(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  if (!letterSpacing) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + letterSpacing;
  return Math.max(0, w - letterSpacing);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + letterSpacing;
  }
}

/**
 * Render text and return a PNG data URL + intrinsic bitmap size. Sized with
 * 2× DPR so the rasterized text stays crisp under zoom.
 */
export function renderText(props: TextProps): { src: string; width: number; height: number } {
  const dpr = 2;
  const lines = (props.content.length ? props.content : " ").split("\n");
  const measurer = document.createElement("canvas").getContext("2d")!;
  measurer.font = fontString(props);

  const lineWidths = lines.map((l) => measureLine(measurer, l || " ", props.letterSpacing));
  const contentW = Math.max(1, Math.ceil(Math.max(...lineWidths)));
  const lineH = Math.ceil(props.fontSize * props.lineHeight);
  const contentH = Math.max(1, lineH * lines.length);

  const padX = Math.ceil(props.fontSize * 0.25);
  const padY = Math.ceil(props.fontSize * 0.25);
  const W = contentW + padX * 2;
  const H = contentH + padY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, W * dpr);
  canvas.height = Math.max(1, H * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.font = fontString(props);
  ctx.fillStyle = props.color;
  ctx.textBaseline = "top";

  const baselineY = padY;
  lines.forEach((line, i) => {
    const w = lineWidths[i];
    let x = padX;
    if (props.align === "center") x = padX + (contentW - w) / 2;
    else if (props.align === "right") x = padX + contentW - w;
    const y = baselineY + i * lineH;
    drawLine(ctx, line || " ", x, y, props.letterSpacing);
    if (props.underline) {
      const uy = y + props.fontSize * 0.92;
      ctx.fillRect(x, uy, w, Math.max(1, props.fontSize * 0.06));
    }
  });

  return { src: canvas.toDataURL("image/png"), width: W, height: H };
}
