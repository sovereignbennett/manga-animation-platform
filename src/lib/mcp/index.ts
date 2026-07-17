import { defineMcp } from "./runtime";
import listAnimationPresets from "./tools/list-animation-presets";
import listEasingFunctions from "./tools/list-easing-functions";
import listExportFormats from "./tools/list-export-formats";
import listEffects from "./tools/list-effects";
import listKeyboardShortcuts from "./tools/list-keyboard-shortcuts";
import listBodyParts from "./tools/list-body-parts";

export default defineMcp({
  name: "motioncut-studio-mcp",
  title: "MotionCut Studio",
  version: "0.1.0",
  instructions:
    "Reference tools for MotionCut Studio, an AI-assisted animation editor for anime/manga/TikTok creators. Use these tools to look up available animation presets, easing curves, export formats, effect filters, keyboard shortcuts, and Magic Cut body-part kinds.",
  tools: [
    listAnimationPresets,
    listEasingFunctions,
    listExportFormats,
    listEffects,
    listKeyboardShortcuts,
    listBodyParts,
  ],
});
