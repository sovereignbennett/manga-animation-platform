import { defineTool } from "../runtime";

const EFFECTS = [
  { id: "glow", name: "Glow", description: "Outer glow with configurable color and strength." },
  { id: "motion-blur", name: "Motion Blur", description: "Directional blur to sell fast movement." },
  { id: "chromatic", name: "Chromatic Aberration", description: "RGB channel split for cinematic edge fringing." },
  { id: "shake", name: "Camera Shake", description: "Global shake modulation for impact frames." },
  { id: "impact", name: "Impact Frame", description: "High-contrast flash used at hit moments." },
];

export default defineTool({
  name: "list_effects",
  title: "List effects",
  description: "List the effect filters available in MotionCut Studio's Effects panel.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(EFFECTS, null, 2) }],
    structuredContent: { effects: EFFECTS },
  }),
});
