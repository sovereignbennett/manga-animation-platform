import { defineTool } from "../runtime";
import { ANIMATION_PRESETS } from "@/services/animation/presets";

export default defineTool({
  name: "list_animation_presets",
  title: "List animation presets",
  description:
    "List MotionCut Studio's built-in one-click animation presets (Pop In, Fade In, Shake, Bounce, Spin, Pulse, etc.) with duration and animated tracks.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const summary = ANIMATION_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationFrames: p.durationFrames,
      animatedProps: Object.keys(p.tracks),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: { presets: summary },
    };
  },
});
