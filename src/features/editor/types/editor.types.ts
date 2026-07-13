import type { BodyPartKind, SegmentationResult } from "@/types/segmentation";

export type ToolId =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "brush"
  | "eraser"
  | "lasso"
  | "pen"
  | "magic"
  | "camera";

export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "add" | "lighten" | "darken";

export interface Point {
  x: number;
  y: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  kind: "image" | "group";
  visible: boolean;
  locked: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageLayer extends BaseLayer {
  kind: "image";
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
  opacity: number;
  blendMode: BlendMode;
  bodyPart?: BodyPartKind;
  confidence?: number;
  pivot?: Point;
}

export interface GroupLayer extends BaseLayer {
  kind: "group";
  children: string[];
}

export type Layer = ImageLayer | GroupLayer;

export interface Project {
  id: string;
  name: string;
  layers: Layer[];
  order: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MagicCutLayerInput {
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
  pivot: Point;
}

export interface EditorState {
  project: Project;
  selectedIds: string[];
  activeTool: ToolId;
  zoom: number;
  pan: Point;
  playing: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  timelineZoom: number;
  undoStack: Project[];
  redoStack: Project[];
}

export interface EditorActions {
  newProject(name: string): void;
  addImageLayer(name: string, src: string, width: number, height: number): void;
  updateLayer(id: string, patch: Partial<ImageLayer>): void;
  renameLayer(id: string, name: string): void;
  toggleVisible(id: string): void;
  toggleLocked(id: string): void;
  removeLayers(ids: string[]): void;
  duplicateLayers(ids: string[]): void;
  reorderLayer(id: string, direction: "up" | "down"): void;
  createGroup(ids: string[], name?: string): void;
  applyMagicCut(
    sourceLayerId: string,
    result: SegmentationResult,
    cutouts: MagicCutLayerInput[],
  ): void;
  select(ids: string[]): void;
  setTool(tool: ToolId): void;
  setZoom(zoom: number): void;
  setPan(pan: Point): void;
  play(): void;
  pause(): void;
  setFrame(frame: number): void;
  setTimelineZoom(zoom: number): void;
  undo(): void;
  redo(): void;
}

export type EditorStore = EditorState & EditorActions;
