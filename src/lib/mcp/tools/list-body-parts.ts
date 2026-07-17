import { defineTool } from "../runtime";

const PARTS = [
  "head", "hair", "face", "eyes", "mouth",
  "torso", "left_arm", "right_arm", "left_hand", "right_hand",
  "left_leg", "right_leg", "left_foot", "right_foot",
  "accessory", "prop", "background",
];

export default defineTool({
  name: "list_body_part_kinds",
  title: "List body-part kinds",
  description:
    "List the anatomical part kinds MotionCut Studio's Magic Cut tool detects and rigs on anime/manga characters.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: PARTS.join(", ") }],
    structuredContent: { parts: PARTS },
  }),
});
