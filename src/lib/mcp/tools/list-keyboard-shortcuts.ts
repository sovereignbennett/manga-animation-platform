import { defineTool } from "../runtime";

const FORMATS = [
  { id: "png", name: "PNG", description: "Single frame PNG at the current playhead." },
  { id: "png-transparent", name: "Transparent PNG", description: "Single frame with alpha channel preserved." },
  { id: "mp4", name: "MP4", description: "Full animation encoded via MediaRecorder (H.264/VP9 depending on browser)." },
  { id: "gif", name: "GIF", description: "Animated GIF encoded client-side with gifenc." },
  { id: "sprite-sheet", name: "Sprite Sheet", description: "Grid of frames as a single PNG for game engines." },
];

export default defineTool({
  name: "list_export_formats",
  title: "List export formats",
  description: "List the export output formats MotionCut Studio can produce from a project.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(FORMATS, null, 2) }],
    structuredContent: { formats: FORMATS },
  }),
});
