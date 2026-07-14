/**
 * Rig pivot suggestions per body part.
 *
 * For each detected part we suggest an anchor point that matches the
 * natural rotation joint. E.g. an upper arm rotates around the shoulder
 * (top of the bbox), a lower arm around the elbow (top), a foot around
 * the ankle (top-center). These are the "pivot points" used by After
 * Effects / Alight Motion rigs.
 *
 * TODO(ai): once a pose-detection model is wired in, replace these
 * heuristics with actual joint keypoints.
 */

import type { BBox, BodyPartKind } from "@/types/segmentation";

/** Returns pivot in image pixel coords for the part's bbox. */
export function suggestPivot(kind: BodyPartKind, bbox: BBox): { x: number; y: number } {
  const cx = bbox.x + bbox.width / 2;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;
  const mid = bbox.y + bbox.height / 2;

  switch (kind) {
    // Rotates around neck — bottom center
    case "head":
    case "face":
    case "hair_front":
    case "hair_back":
      return { x: cx, y: bottom };

    // Rotate around shoulder/hip = top center
    case "arm_left_upper":
    case "arm_right_upper":
    case "leg_left_upper":
    case "leg_right_upper":
      return { x: cx, y: top };

    // Rotate around elbow/knee = top center (relative to lower segment)
    case "arm_left_lower":
    case "arm_right_lower":
    case "leg_left_lower":
    case "leg_right_lower":
      return { x: cx, y: top };

    // Hand/foot rotates around wrist/ankle = top center
    case "hand_left":
    case "hand_right":
    case "foot_left":
    case "foot_right":
      return { x: cx, y: top };

    // Torso rotates around its own center
    case "torso":
      return { x: cx, y: mid };

    default:
      return { x: cx, y: mid };
  }
}

/**
 * Convert a pivot in image pixel coords to normalized anchor (0..1)
 * relative to a cropped layer bitmap of `bbox` size.
 */
export function pivotToAnchor(
  pivot: { x: number; y: number },
  bbox: BBox,
): { anchorX: number; anchorY: number } {
  return {
    anchorX: Math.max(0, Math.min(1, (pivot.x - bbox.x) / Math.max(1, bbox.width))),
    anchorY: Math.max(0, Math.min(1, (pivot.y - bbox.y) / Math.max(1, bbox.height))),
  };
}
