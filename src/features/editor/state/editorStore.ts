import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  EditorStore,
  GroupLayer,
  ImageLayer,
  Layer,
  MagicCutLayerInput,
  Project,
} from "../types/editor.types";

const DEFAULT_TOTAL_FRAMES = 240;
const DEFAULT_FPS = 30;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const MIN_TIMELINE_ZOOM = 0.25;
const MAX_TIMELINE_ZOOM = 4;

const now = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function createProject(name: string): Project {
  const timestamp = now();
  return {
    id: createId("project"),
    name,
    layers: [],
    order: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createImageLayer(input: {
  name: string;
  src: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  parentId?: string;
  anchorX?: number;
  anchorY?: number;
  bodyPart?: ImageLayer["bodyPart"];
  confidence?: number;
  pivot?: ImageLayer["pivot"];
}): ImageLayer {
  const timestamp = now();
  return {
    id: createId("layer"),
    kind: "image",
    name: input.name,
    src: input.src,
    width: input.width,
    height: input.height,
    x: input.x ?? 0,
    y: input.y ?? 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    anchorX: input.anchorX ?? 0.5,
    anchorY: input.anchorY ?? 0.5,
    opacity: 1,
    blendMode: "normal",
    visible: true,
    locked: false,
    parentId: input.parentId,
    bodyPart: input.bodyPart,
    confidence: input.confidence,
    pivot: input.pivot,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createGroupLayer(name: string, children: string[]): GroupLayer {
  const timestamp = now();
  return {
    id: createId("group"),
    kind: "group",
    name,
    children,
    visible: true,
    locked: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function touchProject(project: Project): Project {
  return { ...project, updatedAt: now() };
}

function withoutLayers(project: Project, ids: string[]): Project {
  const removeSet = new Set(ids);
  return touchProject({
    ...project,
    layers: project.layers
      .filter((layer) => !removeSet.has(layer.id))
      .map((layer) => {
        if (layer.kind !== "group")
          return removeSet.has(layer.parentId ?? "") ? { ...layer, parentId: undefined } : layer;
        return { ...layer, children: layer.children.filter((id) => !removeSet.has(id)) };
      }),
    order: project.order.filter((id) => !removeSet.has(id)),
  });
}

function updateProjectLayer(
  project: Project,
  id: string,
  update: (layer: Layer) => Layer,
): Project {
  return touchProject({
    ...project,
    layers: project.layers.map((layer) =>
      layer.id === id ? update({ ...layer, updatedAt: now() }) : layer,
    ),
  });
}

function withHistory(state: EditorStore, project: Project): Partial<EditorStore> {
  return {
    project,
    undoStack: [...state.undoStack, state.project].slice(-50),
    redoStack: [],
  };
}

function insertAfter(order: string[], anchorId: string, ids: string[]): string[] {
  const index = order.indexOf(anchorId);
  if (index === -1) return [...order, ...ids];
  return [...order.slice(0, index + 1), ...ids, ...order.slice(index + 1)];
}

export const useEditor = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    project: createProject("Untitled Project"),
    selectedIds: [],
    activeTool: "select",
    zoom: 1,
    pan: { x: 0, y: 0 },
    playing: false,
    currentFrame: 0,
    totalFrames: DEFAULT_TOTAL_FRAMES,
    fps: DEFAULT_FPS,
    timelineZoom: 1,
    undoStack: [],
    redoStack: [],

    newProject: (name) =>
      set((state) => ({
        ...withHistory(state, createProject(name)),
        selectedIds: [],
        playing: false,
        currentFrame: 0,
        pan: { x: 0, y: 0 },
        zoom: 1,
      })),

    addImageLayer: (name, src, width, height) =>
      set((state) => {
        const layer = createImageLayer({ name, src, width, height });
        const project = touchProject({
          ...state.project,
          layers: [...state.project.layers, layer],
          order: [...state.project.order, layer.id],
        });
        return { ...withHistory(state, project), selectedIds: [layer.id] };
      }),

    updateLayer: (id, patch) =>
      set((state) => {
        const project = updateProjectLayer(state.project, id, (layer) =>
          layer.kind === "image"
            ? ({ ...layer, ...patch, id, kind: "image" } as ImageLayer)
            : layer,
        );
        return withHistory(state, project);
      }),

    renameLayer: (id, name) =>
      set((state) => {
        const project = updateProjectLayer(state.project, id, (layer) => ({
          ...layer,
          name: name.trim() || layer.name,
        }));
        return withHistory(state, project);
      }),

    toggleVisible: (id) =>
      set((state) =>
        withHistory(
          state,
          updateProjectLayer(state.project, id, (layer) => ({ ...layer, visible: !layer.visible })),
        ),
      ),

    toggleLocked: (id) =>
      set((state) =>
        withHistory(
          state,
          updateProjectLayer(state.project, id, (layer) => ({ ...layer, locked: !layer.locked })),
        ),
      ),

    removeLayers: (ids) =>
      set((state) => ({
        ...withHistory(state, withoutLayers(state.project, ids)),
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
      })),

    duplicateLayers: (ids) =>
      set((state) => {
        const sourceLayers = state.project.layers.filter(
          (layer) => ids.includes(layer.id) && layer.kind === "image",
        ) as ImageLayer[];
        if (sourceLayers.length === 0) return {};
        const duplicated = sourceLayers.map((layer) =>
          createImageLayer({
            name: `${layer.name} Copy`,
            src: layer.src,
            width: layer.width,
            height: layer.height,
            x: layer.x + 24,
            y: layer.y + 24,
            anchorX: layer.anchorX,
            anchorY: layer.anchorY,
            bodyPart: layer.bodyPart,
            confidence: layer.confidence,
            pivot: layer.pivot,
          }),
        );
        const project = touchProject({
          ...state.project,
          layers: [...state.project.layers, ...duplicated],
          order: [...state.project.order, ...duplicated.map((layer) => layer.id)],
        });
        return { ...withHistory(state, project), selectedIds: duplicated.map((layer) => layer.id) };
      }),

    reorderLayer: (id, direction) =>
      set((state) => {
        const order = [...state.project.order];
        const index = order.indexOf(id);
        const target = direction === "up" ? index + 1 : index - 1;
        if (index < 0 || target < 0 || target >= order.length) return {};
        [order[index], order[target]] = [order[target], order[index]];
        return withHistory(state, touchProject({ ...state.project, order }));
      }),

    createGroup: (ids, name = "New Group") =>
      set((state) => {
        const validIds = ids.filter((id) => state.project.layers.some((layer) => layer.id === id));
        if (validIds.length === 0) return {};
        const group = createGroupLayer(name, validIds);
        const project = touchProject({
          ...state.project,
          layers: [
            ...state.project.layers.map((layer) =>
              validIds.includes(layer.id) ? { ...layer, parentId: group.id } : layer,
            ),
            group,
          ],
          order: [...state.project.order, group.id],
        });
        return { ...withHistory(state, project), selectedIds: [group.id] };
      }),

    applyMagicCut: (sourceLayerId: string, _result, cutouts: MagicCutLayerInput[]) =>
      set((state) => {
        if (cutouts.length === 0) return {};
        const source = state.project.layers.find((layer) => layer.id === sourceLayerId);
        const group = createGroupLayer(`${source?.name ?? "Magic Cut"} Rig`, []);
        const layers = cutouts.map((cutout) =>
          createImageLayer({
            name: cutout.label,
            src: cutout.src,
            width: cutout.width,
            height: cutout.height,
            x: cutout.x,
            y: cutout.y,
            parentId: group.id,
            anchorX: cutout.anchorX,
            anchorY: cutout.anchorY,
            bodyPart: cutout.bodyPart,
            confidence: cutout.confidence,
            pivot: cutout.pivot,
          }),
        );
        const childIds = layers.map((layer) => layer.id);
        const nextGroup = { ...group, children: childIds };
        const updatedExistingLayers = state.project.layers.map((layer) =>
          layer.id === sourceLayerId ? { ...layer, visible: false, updatedAt: now() } : layer,
        );
        const project = touchProject({
          ...state.project,
          layers: [...updatedExistingLayers, nextGroup, ...layers],
          order: insertAfter(state.project.order, sourceLayerId, [nextGroup.id, ...childIds]),
        });
        return { ...withHistory(state, project), selectedIds: childIds };
      }),

    select: (ids) => set({ selectedIds: ids }),
    setTool: (activeTool) => set({ activeTool }),
    setZoom: (zoom) => set({ zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }),
    setPan: (pan) => set({ pan }),
    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    setFrame: (frame) => set((state) => ({ currentFrame: clamp(frame, 0, state.totalFrames) })),
    setTimelineZoom: (timelineZoom) =>
      set({ timelineZoom: clamp(timelineZoom, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM) }),

    undo: () =>
      set((state) => {
        const previous = state.undoStack.at(-1);
        if (!previous) return {};
        return {
          project: previous,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [state.project, ...state.redoStack].slice(0, 50),
          selectedIds: [],
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.redoStack[0];
        if (!next) return {};
        return {
          project: next,
          undoStack: [...state.undoStack, state.project].slice(-50),
          redoStack: state.redoStack.slice(1),
          selectedIds: [],
        };
      }),
  })),
);

export type {
  BlendMode,
  EditorActions,
  EditorState,
  EditorStore,
  GroupLayer,
  ImageLayer,
  Layer,
  MagicCutLayerInput,
  Point,
  Project,
  ToolId,
} from "../types/editor.types";
