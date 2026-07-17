import { defineTool } from "../runtime";

const EASINGS = [
  "linear",
  "easeInQuad", "easeOutQuad", "easeInOutQuad",
  "easeInCubic", "easeOutCubic", "easeInOutCubic",
  "easeInBack", "easeOutBack", "easeInOutBack",
  "easeInElastic", "easeOutElastic",
  "easeInBounce", "easeOutBounce",
  "hold",
];

export default defineTool({
  name: "list_easing_functions",
  title: "List easing functions",
  description:
    "List the easing curves available for keyframes in MotionCut Studio's animation timeline.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: EASINGS.join(", ") }],
    structuredContent: { easings: EASINGS },
  }),
});
