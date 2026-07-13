import type { BBox, BodyPartKind } from "@/types/segmentation";

export interface PivotPoint {
  x: number;
  y: number;
}

const PIVOT_RATIOS: Partial<Record<BodyPartKind, PivotPoint>> = {
  hair_front: { x: 0.5, y: 0.8 },
  hair_back: { x: 0.5, y: 0.25 },
  head: { x: 0.5, y: 0.75 },
  face: { x: 0.5, y: 0.65 },
  eyes: { x: 0.5, y: 0.5 },
  mouth: { x: 0.5, y: 0.45 },
  torso: { x: 0.5, y: 0.15 },
  arm_left_upper: { x: 0.82, y: 0.12 },
  arm_left_lower: { x: 0.78, y: 0.1 },
  hand_left: { x: 0.5, y: 0.15 },
  arm_right_upper: { x: 0.18, y: 0.12 },
  arm_right_lower: { x: 0.22, y: 0.1 },
  hand_right: { x: 0.5, y: 0.15 },
  leg_left_upper: { x: 0.5, y: 0.1 },
  leg_left_lower: { x: 0.5, y: 0.08 },
  foot_left: { x: 0.5, y: 0.2 },
  leg_right_upper: { x: 0.5, y: 0.1 },
  leg_right_lower: { x: 0.5, y: 0.08 },
  foot_right: { x: 0.5, y: 0.2 },
};

export function suggestPivot(kind: BodyPartKind, bounds: BBox): PivotPoint {
  const ratio = PIVOT_RATIOS[kind] ?? { x: 0.5, y: 0.5 };

  return {
    x: bounds.x + bounds.width * ratio.x,
    y: bounds.y + bounds.height * ratio.y,
  };
}

export function pivotToAnchor(pivot: PivotPoint, bounds: BBox): PivotPoint {
  return {
    x: bounds.width > 0 ? (pivot.x - bounds.x) / bounds.width : 0.5,
    y: bounds.height > 0 ? (pivot.y - bounds.y) / bounds.height : 0.5,
  };
}
