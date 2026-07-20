/**
 * Cross-cutting types used by more than one service.
 * Keep this file tiny — feature-specific types belong to that feature.
 */

export type ID = string;

export interface TimeRange {
  /** seconds */
  start: number;
  /** seconds */
  end: number;
}

export interface Vec2 { x: number; y: number }

export interface Transform {
  x: number;
  y: number;
  rotation: number; // radians
  scaleX: number;
  scaleY: number;
  anchorX: number; // 0..1
  anchorY: number; // 0..1
  opacity: number; // 0..1
}

export const IDENTITY_TRANSFORM: Transform = {
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
  anchorX: 0.5, anchorY: 0.5, opacity: 1,
};

export interface RGBA { r: number; g: number; b: number; a: number }

export type LayerKind =
  | "image" | "video" | "text" | "audio"
  | "null" | "adjustment" | "camera" | "folder";

export interface Layer {
  id: ID;
  kind: LayerKind;
  name: string;
  parentId: ID | null;
  visible: boolean;
  locked: boolean;
  color: string; // track color hex
  transform: Transform;
  /** timeline placement in seconds */
  range: TimeRange;
  /** kind-specific payload; opaque to the layer system */
  data?: Record<string, unknown>;
}

export interface Clip {
  id: ID;
  layerId: ID;
  range: TimeRange;
  /** source offset in seconds (for trimming) */
  sourceOffset: number;
  thumbnailUrl?: string;
  fadeIn?: number;  // seconds
  fadeOut?: number; // seconds
}

export interface Marker {
  id: ID;
  time: number;
  label?: string;
  color?: string;
}
