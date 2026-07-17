import type { BodyPartKind, SegmentationResult } from "@/types/segmentation";
import type { AnimatableProp, EasingKind, Keyframes, AnimationPreset } from "@/types/animation";
import type { LayerEffect, EffectKind } from "@/types/effects";

export type MaybePromise<T> = T | Promise<T>;

export type SidebarPanel =
  | "projects" | "assets" | "layers" | "groups"
  | "magic" | "animation" | "effects" | "export" | "settings";

export type ToolId =
  | "select" | "move" | "rotate" | "scale"
  | "brush" | "eraser" | "lasso" | "pen"
  | "magic" | "camera";

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "add" | "lighten" | "darken";

export interface Layer {
  id: string;
  name: string;
  parentId: string | null;
  kind: "image" | "group";
  mediaType?: "image" | "video";
  src?: string;
  videoDurationSec?: number;
  mask?: string;
  bodyPart?: BodyPartKind;
  bodyPartConfidence?: number;
  pivotSuggestion?: { x: number; y: number };
  sourceLayerId?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  keyframes?: Keyframes;
  effects?: LayerEffect[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layers: Layer[];
  order: string[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface HistoryEntry {
  layers: Layer[];
  order: string[];
}

export interface MagicCutCutout {
  partId: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  bodyPart: BodyPartKind;
  label: string;
  confidence: number;
  pivot: { x: number; y: number };
}

export type { AnimatableProp, AnimationPreset, EffectKind, EasingKind, Keyframes, LayerEffect, SegmentationResult };

