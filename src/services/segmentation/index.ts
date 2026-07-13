/**
 * Segmentation service entry point.
 * Register default providers here so the editor only depends on this module.
 */

import { registerProvider, segmentHybrid, getProvider } from "./registry";
import { imglyProvider } from "./imglyProvider";
import { aiProvider } from "./aiProvider";

registerProvider("foreground", imglyProvider);
registerProvider("parts", aiProvider);

export { segmentHybrid, getProvider, registerProvider };
export type { SegmentationStrategy } from "./registry";
