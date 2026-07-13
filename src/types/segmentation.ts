/**
 * Segmentation domain types.
 *
 * These types are transport-agnostic: every provider (client-side WASM,
 * server-side AI Gateway, future custom models) speaks in these shapes.
 * The editor never talks to a provider directly — it goes through the
 * SegmentationService in src/services/segmentation.
 */

/** Canonical body-part taxonomy for anime/character rigs. */
export type BodyPartKind =
  | "hair_front"
  | "hair_back"
  | "head"
  | "face"
  | "eyes"
  | "mouth"
  | "torso"
  | "arm_left_upper"
  | "arm_left_lower"
  | "hand_left"
  | "arm_right_upper"
  | "arm_right_lower"
  | "hand_right"
  | "leg_left_upper"
  | "leg_left_lower"
  | "foot_left"
  | "leg_right_upper"
  | "leg_right_lower"
  | "foot_right"
  | "accessory"
  | "background"
  | "foreground"
  | "unknown";

/** Human-friendly labels rendered in the UI. */
export const BODY_PART_LABELS: Record<BodyPartKind, string> = {
  hair_front: "Hair (Front)",
  hair_back: "Hair (Back)",
  head: "Head",
  face: "Face",
  eyes: "Eyes",
  mouth: "Mouth",
  torso: "Torso",
  arm_left_upper: "L Upper Arm",
  arm_left_lower: "L Forearm",
  hand_left: "L Hand",
  arm_right_upper: "R Upper Arm",
  arm_right_lower: "R Forearm",
  hand_right: "R Hand",
  leg_left_upper: "L Thigh",
  leg_left_lower: "L Shin",
  foot_left: "L Foot",
  leg_right_upper: "R Thigh",
  leg_right_lower: "R Shin",
  foot_right: "R Foot",
  accessory: "Accessory",
  background: "Background",
  foreground: "Foreground",
  unknown: "Unknown",
};

/** Axis-aligned box in **image pixel** coordinates (origin top-left). */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A raster mask. `data` is a data URL of a single-channel PNG where opaque
 * pixels belong to the part. `bounds` is the tight bbox of the mask inside
 * the source image, so consumers can crop without re-scanning pixels.
 */
export interface Mask {
  data: string; // data:image/png;base64,...
  bounds: BBox;
  width: number; // source image width (mask is in same coords)
  height: number;
}

/** A single segmented part returned by a provider. */
export interface SegmentedPart {
  id: string;
  kind: BodyPartKind;
  label: string;
  confidence: number; // 0..1
  bbox: BBox;
  mask?: Mask; // optional — providers that only detect bboxes may omit
  /** Suggested pivot in image pixel coords (rig joint, e.g. shoulder). */
  suggestedPivot?: { x: number; y: number };
}

/** A complete segmentation of a source image. */
export interface SegmentationResult {
  sourceWidth: number;
  sourceHeight: number;
  /** Provider that produced this result (e.g. "imgly", "ai-gateway"). */
  provider: string;
  /** Whole-subject foreground cutout, if the provider produced one. */
  foreground?: Mask;
  parts: SegmentedPart[];
  /** Model / version tag for reproducibility. */
  modelTag?: string;
  /** Millis spent inside the provider. */
  durationMs: number;
}

/** Options a caller may pass to any provider. */
export interface SegmentationOptions {
  /** Only produce whole-subject foreground, skip part detection. */
  foregroundOnly?: boolean;
  /** Restrict detection to these parts (empty = all supported). */
  restrictTo?: BodyPartKind[];
  /** Progress callback (0..1). Providers should call at least once. */
  onProgress?: (progress: number, stage: string) => void;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

/** Capability descriptor so the UI knows what a provider can do. */
export interface ProviderCapabilities {
  id: string;
  displayName: string;
  /** Runs entirely in the browser (no network). */
  clientSide: boolean;
  /** Produces per-part masks (not just bboxes). */
  producesPartMasks: boolean;
  /** Approximate cost tier: "free" | "cheap" | "standard". */
  costTier: "free" | "cheap" | "standard";
}

/** The provider contract. All providers implement this. */
export interface SegmentationProvider {
  capabilities: ProviderCapabilities;
  segment(imageSrc: string, opts?: SegmentationOptions): Promise<SegmentationResult>;
}
