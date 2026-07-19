import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { BodyPartKind, SegmentationResult } from "@/types/segmentation";
import type {
  AnimatableProp, EasingKind, Keyframes, AnimationPreset,
} from "@/types/animation";
import type { LayerEffect, EffectKind } from "@/types/effects";
import { EFFECT_DEFAULTS } from "@/types/effects";
import { ANIMATABLE_PROPS } from "@/types/animation";
import { sampleProp, upsertKeyframe, removeKeyframeAt } from "@/services/animation/sampling";
import type { TextProps } from "@/services/text/renderText";

export type SidebarPanel =
  | "projects" | "assets" | "layers" | "groups"
  | "magic" | "animation" | "effects" | "export" | "settings";

export type ToolId =
  | "select" | "move" | "rotate" | "scale"
  | "brush" | "eraser" | "lasso" | "pen"
  | "text" | "magic" | "camera";

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "add" | "lighten" | "darken";

export interface Layer {
  id: string;
  name: string;
  parentId: string | null; // group id
  kind: "image" | "group";
  /** Media type for image kind — controls sprite source. */
  mediaType?: "image" | "video";
  src?: string;                  // data URL for images / blob URL for video
  /** Video-specific: intrinsic duration in seconds (populated on import). */
  videoDurationSec?: number;
  /** Optional soft mask (RGBA data URL, same size as src). Editable via brush/eraser. */
  mask?: string;
  /** Body part this layer represents (populated by Magic Cut). */
  bodyPart?: BodyPartKind;
  /** Confidence 0..1 from the AI provider. */
  bodyPartConfidence?: number;
  /** Suggested pivot in **layer-local pixel** coords (converted to anchor when applied). */
  pivotSuggestion?: { x: number; y: number };
  /** Id of the source layer this was cut from — enables non-destructive re-runs. */
  sourceLayerId?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;              // degrees
  scaleX: number;
  scaleY: number;
  anchorX: number;               // 0..1
  anchorY: number;               // 0..1
  opacity: number;               // 0..1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  /** Per-property keyframe tracks. Missing = property is static. */
  keyframes?: Keyframes;
  /** Effects stack (glow, motion blur, chromatic, shake, impact). */
  effects?: LayerEffect[];
  /** Text properties — present iff this image layer was created via the Text tool. */
  text?: TextProps;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layers: Layer[];
  order: string[];               // top -> bottom paint order (last painted = top)
  /** Output canvas resolution — used for exports and centered guide. */
  canvasWidth: number;
  canvasHeight: number;
}

interface HistoryEntry {
  layers: Layer[];
  order: string[];
}

interface EditorState {
  project: Project;
  selectedIds: string[];
  activeTool: ToolId;
  zoom: number;
  pan: { x: number; y: number };

  // timeline
  playing: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  timelineZoom: number;
  /** Auto-record: mutating an animatable prop writes a keyframe at currentFrame. */
  recording: boolean;

  history: { past: HistoryEntry[]; future: HistoryEntry[] };

  /** Currently open left-sidebar panel — driven by the icon rail and Export button in the top bar. */
  sidebarPanel: SidebarPanel;

  // actions
  setTool: (t: ToolId) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  select: (ids: string[]) => void;
  setSidebarPanel: (p: SidebarPanel) => void;
  addImageLayer: (name: string, src: string, width: number, height: number) => void;
  addVideoLayer: (name: string, src: string, width: number, height: number, durationSec: number) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayers: (ids: string[]) => void;
  duplicateLayers: (ids: string[]) => void;
  toggleVisible: (id: string) => void;
  toggleLocked: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  reorderLayer: (id: string, direction: "up" | "down") => void;
  createGroup: (ids: string[], name?: string) => string | null;
  newProject: (name?: string) => void;
  setCanvasSize: (w: number, h: number) => void;
  setTotalFrames: (n: number) => void;
  setFps: (n: number) => void;

  // effects
  addEffect: (layerId: string, kind: EffectKind) => void;
  updateEffect: (layerId: string, index: number, patch: Partial<LayerEffect>) => void;
  removeEffect: (layerId: string, index: number) => void;

  /**
   * Non-destructive Magic Cut result application: hides the source layer,
   * creates one child layer per detected part (grouped), with pivots.
   */
  applyMagicCut: (sourceLayerId: string, result: SegmentationResult, cutouts: Array<{
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
  }>) => void;

  play: () => void;
  pause: () => void;
  setFrame: (f: number) => void;
  setTimelineZoom: (z: number) => void;
  toggleRecord: () => void;

  // keyframes
  setKeyframe: (layerId: string, prop: AnimatableProp, frame: number, value: number, easing?: EasingKind) => void;
  removeKeyframe: (layerId: string, prop: AnimatableProp, frame: number) => void;
  clearKeyframes: (layerId: string, prop?: AnimatableProp) => void;
  setKeyframeEasing: (layerId: string, prop: AnimatableProp, frame: number, easing: EasingKind) => void;
  applyAnimationPreset: (layerId: string, preset: AnimationPreset, startFrame?: number) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyProject = (name = "Untitled Project"): Project => ({
  id: uid(),
  name,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  layers: [],
  order: [],
  canvasWidth: 1080,
  canvasHeight: 1920,
});

const STORAGE_KEY = "motioncut:project:v1";

const loadProject = (): Project => {
  if (typeof window === "undefined") return emptyProject();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProject();
    const p = JSON.parse(raw) as Project;
    return { ...emptyProject(), ...p, canvasWidth: p.canvasWidth ?? 1080, canvasHeight: p.canvasHeight ?? 1920 };
  } catch {
    return emptyProject();
  }
};

export const useEditor = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    project: emptyProject(),
    selectedIds: [],
    activeTool: "select",
    zoom: 1,
    pan: { x: 0, y: 0 },

    playing: false,
    currentFrame: 0,
    totalFrames: 240,
    fps: 30,
    timelineZoom: 1,
    recording: false,

    history: { past: [], future: [] },

    sidebarPanel: "layers",

    setTool: (t) => set({ activeTool: t }),
    setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(8, z)) }),
    setPan: (p) => set({ pan: p }),
    select: (ids) => set({ selectedIds: ids }),
    setSidebarPanel: (p) => set({ sidebarPanel: p }),
    setCanvasSize: (w, h) => set((s) => ({ project: { ...s.project, canvasWidth: w, canvasHeight: h, updatedAt: Date.now() } })),
    setTotalFrames: (n) => set({ totalFrames: Math.max(1, Math.round(n)) }),
    setFps: (n) => set({ fps: Math.max(1, Math.round(n)) }),

    addVideoLayer: (name, src, width, height, durationSec) => {
      get().pushHistory();
      const id = uid();
      const layer: Layer = {
        id, name, parentId: null, kind: "image", mediaType: "video",
        src, videoDurationSec: durationSec, width, height,
        x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
        anchorX: 0.5, anchorY: 0.5, opacity: 1,
        blendMode: "normal", visible: true, locked: false,
      };
      set((s) => ({
        project: {
          ...s.project,
          layers: [...s.project.layers, layer],
          order: [...s.project.order, id],
          updatedAt: Date.now(),
        },
        selectedIds: [id],
      }));
    },

    addEffect: (layerId, kind) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) =>
            l.id === layerId
              ? { ...l, effects: [...(l.effects ?? []), { ...EFFECT_DEFAULTS[kind] }] }
              : l,
          ),
          updatedAt: Date.now(),
        },
      }));
    },
    updateEffect: (layerId, index, patch) => {
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId || !l.effects) return l;
            const next = l.effects.map((e, i) => (i === index ? ({ ...e, ...patch } as LayerEffect) : e));
            return { ...l, effects: next };
          }),
          updatedAt: Date.now(),
        },
      }));
    },
    removeEffect: (layerId, index) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId || !l.effects) return l;
            return { ...l, effects: l.effects.filter((_, i) => i !== index) };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    pushHistory: () => {
      const { project, history } = get();
      const snap: HistoryEntry = {
        layers: JSON.parse(JSON.stringify(project.layers)),
        order: [...project.order],
      };
      set({
        history: {
          past: [...history.past.slice(-99), snap],
          future: [],
        },
      });
    },

    addImageLayer: (name, src, width, height) => {
      get().pushHistory();
      const id = uid();
      const layer: Layer = {
        id, name, parentId: null, kind: "image",
        src, width, height,
        x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
        anchorX: 0.5, anchorY: 0.5, opacity: 1,
        blendMode: "normal", visible: true, locked: false,
      };
      set((s) => ({
        project: {
          ...s.project,
          layers: [...s.project.layers, layer],
          order: [...s.project.order, id],
          updatedAt: Date.now(),
        },
        selectedIds: [id],
      }));
    },

    updateLayer: (id, patch) => {
      set((s) => {
        // Auto-record: when recording is on, any animatable prop in the patch
        // is written to that layer's keyframe track at the current frame as
        // well as the base value. Base value acts as the pose when no
        // keyframes exist for that prop.
        const frame = s.currentFrame;
        const recording = s.recording;
        return {
          project: {
            ...s.project,
            layers: s.project.layers.map((l) => {
              if (l.id !== id) return l;
              const next: Layer = { ...l, ...patch };
              if (recording) {
                const kfs: Keyframes = { ...(l.keyframes ?? {}) };
                let changed = false;
                for (const prop of ANIMATABLE_PROPS) {
                  if (patch[prop] !== undefined) {
                    kfs[prop] = upsertKeyframe(kfs[prop], {
                      frame,
                      value: patch[prop] as number,
                      easing: kfs[prop]?.find((k) => k.frame === frame)?.easing ?? "easeInOutQuad",
                    });
                    changed = true;
                  }
                }
                if (changed) next.keyframes = kfs;
              }
              return next;
            }),
            updatedAt: Date.now(),
          },
        };
      });
    },

    setKeyframe: (layerId, prop, frame, value, easing = "easeInOutQuad") => {
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId) return l;
            const kfs: Keyframes = { ...(l.keyframes ?? {}) };
            kfs[prop] = upsertKeyframe(kfs[prop], { frame, value, easing });
            return { ...l, [prop]: value, keyframes: kfs };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    removeKeyframe: (layerId, prop, frame) => {
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId) return l;
            const kfs: Keyframes = { ...(l.keyframes ?? {}) };
            const next = removeKeyframeAt(kfs[prop], frame);
            if (next.length === 0) delete kfs[prop];
            else kfs[prop] = next;
            return { ...l, keyframes: kfs };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    clearKeyframes: (layerId, prop) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId) return l;
            if (!prop) return { ...l, keyframes: {} };
            const kfs: Keyframes = { ...(l.keyframes ?? {}) };
            delete kfs[prop];
            return { ...l, keyframes: kfs };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    setKeyframeEasing: (layerId, prop, frame, easing) => {
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => {
            if (l.id !== layerId) return l;
            const list = l.keyframes?.[prop];
            if (!list) return l;
            const kfs: Keyframes = { ...l.keyframes };
            kfs[prop] = list.map((k) => (k.frame === frame ? { ...k, easing } : k));
            return { ...l, keyframes: kfs };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    applyAnimationPreset: (layerId, preset, startFrame) => {
      get().pushHistory();
      set((s) => {
        const start = startFrame ?? s.currentFrame;
        return {
          project: {
            ...s.project,
            layers: s.project.layers.map((l) => {
              if (l.id !== layerId) return l;
              const kfs: Keyframes = { ...(l.keyframes ?? {}) };
              (Object.keys(preset.tracks) as AnimatableProp[]).forEach((prop) => {
                const track = preset.tracks[prop]!;
                // Rest value = the layer's current static value for that prop.
                // For x/y/rotation the preset values are additive deltas;
                // for scale* / opacity / anchor* they are absolute.
                const isDelta = prop === "x" || prop === "y" || prop === "rotation";
                const rest = l[prop] as number;
                track.forEach((entry) => {
                  const frame = Math.round(start + entry.t * preset.durationFrames);
                  const value = isDelta ? rest + entry.value : entry.value;
                  kfs[prop] = upsertKeyframe(kfs[prop], { frame, value, easing: entry.easing });
                });
              });
              return { ...l, keyframes: kfs };
            }),
            updatedAt: Date.now(),
          },
        };
      });
    },

    toggleRecord: () => set((s) => ({ recording: !s.recording })),

    removeLayers: (ids) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.filter((l) => !ids.includes(l.id)),
          order: s.project.order.filter((o) => !ids.includes(o)),
          updatedAt: Date.now(),
        },
        selectedIds: [],
      }));
    },

    duplicateLayers: (ids) => {
      get().pushHistory();
      const { project } = get();
      const dupes: Layer[] = [];
      const newOrder = [...project.order];
      ids.forEach((id) => {
        const src = project.layers.find((l) => l.id === id);
        if (!src) return;
        const nid = uid();
        dupes.push({ ...src, id: nid, name: src.name + " copy", x: src.x + 20, y: src.y + 20 });
        newOrder.push(nid);
      });
      set({
        project: {
          ...project,
          layers: [...project.layers, ...dupes],
          order: newOrder,
          updatedAt: Date.now(),
        },
        selectedIds: dupes.map((d) => d.id),
      });
    },

    toggleVisible: (id) =>
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l),
        },
      })),

    toggleLocked: (id) =>
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => l.id === id ? { ...l, locked: !l.locked } : l),
        },
      })),

    renameLayer: (id, name) =>
      set((s) => ({
        project: {
          ...s.project,
          layers: s.project.layers.map((l) => l.id === id ? { ...l, name } : l),
        },
      })),

    reorderLayer: (id, direction) => {
      get().pushHistory();
      set((s) => {
        const order = [...s.project.order];
        const idx = order.indexOf(id);
        if (idx < 0) return s;
        // "up" in UI = higher visual z = later in order (painted on top)
        const target = direction === "up" ? idx + 1 : idx - 1;
        if (target < 0 || target >= order.length) return s;
        [order[idx], order[target]] = [order[target], order[idx]];
        return { project: { ...s.project, order } };
      });
    },

    createGroup: (ids, name = "Group") => {
      if (ids.length === 0) return null;
      get().pushHistory();
      const gid = uid();
      const group: Layer = {
        id: gid, name, parentId: null, kind: "group",
        src: undefined, width: 0, height: 0, x: 0, y: 0,
        rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5,
        opacity: 1, blendMode: "normal", visible: true, locked: false,
      };
      set((s) => ({
        project: {
          ...s.project,
          layers: [
            group,
            ...s.project.layers.map((l) => ids.includes(l.id) ? { ...l, parentId: gid } : l),
          ],
          order: [...s.project.order, gid],
        },
        selectedIds: [gid],
      }));
      return gid;
    },

    applyMagicCut: (sourceLayerId, _result, cutouts) => {
      get().pushHistory();
      const state = get();
      const source = state.project.layers.find((l) => l.id === sourceLayerId);
      if (!source) return;

      const gid = uid();
      const group: Layer = {
        id: gid, name: `${source.name} (Rigged)`, parentId: null, kind: "group",
        width: 0, height: 0, x: source.x, y: source.y,
        rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5,
        opacity: 1, blendMode: "normal", visible: true, locked: false,
      };

      // Layers are positioned so their local anchor lands at the pivot in
      // the source's coordinate space. Source layer stays but hidden.
      const partLayers: Layer[] = cutouts.map((c) => ({
        id: uid(),
        name: c.label,
        parentId: gid,
        kind: "image",
        src: c.src,
        bodyPart: c.bodyPart,
        bodyPartConfidence: c.confidence,
        pivotSuggestion: c.pivot,
        sourceLayerId,
        width: c.width,
        height: c.height,
        x: source.x + (c.x - source.width / 2) + c.width * c.anchorX,
        y: source.y + (c.y - source.height / 2) + c.height * c.anchorY,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: c.anchorX,
        anchorY: c.anchorY,
        opacity: 1,
        blendMode: "normal",
        visible: true,
        locked: false,
      }));

      const partOrder = partLayers.map((l) => l.id);

      set((s) => ({
        project: {
          ...s.project,
          layers: [
            ...s.project.layers.map((l) => l.id === sourceLayerId ? { ...l, visible: false } : l),
            group,
            ...partLayers,
          ],
          order: [...s.project.order, gid, ...partOrder],
          updatedAt: Date.now(),
        },
        selectedIds: [gid],
      }));
    },

    newProject: (name) => {
      set({
        project: emptyProject(name),
        selectedIds: [],
        history: { past: [], future: [] },
        currentFrame: 0,
      });
    },

    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    setFrame: (f) => set((s) => ({ currentFrame: Math.max(0, Math.min(s.totalFrames, f)) })),
    setTimelineZoom: (z) => set({ timelineZoom: Math.max(0.25, Math.min(4, z)) }),

    undo: () => {
      const { history, project } = get();
      const prev = history.past[history.past.length - 1];
      if (!prev) return;
      const currentSnap: HistoryEntry = {
        layers: JSON.parse(JSON.stringify(project.layers)),
        order: [...project.order],
      };
      set({
        project: { ...project, layers: prev.layers, order: prev.order, updatedAt: Date.now() },
        history: {
          past: history.past.slice(0, -1),
          future: [currentSnap, ...history.future].slice(0, 100),
        },
      });
    },
    redo: () => {
      const { history, project } = get();
      const next = history.future[0];
      if (!next) return;
      const currentSnap: HistoryEntry = {
        layers: JSON.parse(JSON.stringify(project.layers)),
        order: [...project.order],
      };
      set({
        project: { ...project, layers: next.layers, order: next.order, updatedAt: Date.now() },
        history: {
          past: [...history.past, currentSnap].slice(-100),
          future: history.future.slice(1),
        },
      });
    },
  })),
);

// Autosave (client only)
if (typeof window !== "undefined") {
  // Hydrate once
  const stored = loadProject();
  if (stored.layers.length > 0) {
    useEditor.setState({ project: stored });
  }
  let t: ReturnType<typeof setTimeout> | null = null;
  useEditor.subscribe(
    (s) => s.project,
    (project) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* ignore */ }
      }, 400);
    },
  );
}

/**
 * Sample a layer's animatable properties at a given frame. Returns the
 * same shape as the layer with animated fields overridden. Non-animated
 * fields are shared by reference — cheap enough for the render loop.
 */
export function sampleLayer(layer: Layer, frame: number): Layer {
  const kfs = layer.keyframes;
  if (!kfs) return layer;
  const out: Layer = { ...layer };
  for (const prop of ANIMATABLE_PROPS) {
    if (kfs[prop] && kfs[prop]!.length > 0) {
      (out as unknown as Record<string, number>)[prop] = sampleProp(kfs, prop, frame, layer[prop] as number);
    }
  }
  return out;
}

