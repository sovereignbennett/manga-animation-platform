import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban, Image as ImageIcon, Layers, FolderTree, Film,
  Sparkles, Download, Settings, Eye, EyeOff, Lock, Unlock, Trash2, Copy,
  ChevronUp, ChevronDown, Plus, Upload, Wand2, Video, Brush, Type,
  Waves, Shuffle, Music2,
} from "lucide-react";
import { useEditor, type SidebarPanel } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { MagicCutPanel } from "./MagicCutPanel";
import { AnimationPanel } from "./AnimationPanel";
import { EffectsPanel } from "./EffectsPanel";
import { ExportPanel } from "./ExportPanel";
import { BUILTIN_BRUSH_PRESETS } from "@/services/brush";
import { BUILTIN_SHAKES } from "@/services/shakes";
import { BUILTIN_TRANSITIONS, TransitionEngine } from "@/services/transitions";
import { DEFAULT_TEXT_PROPS, renderText, type TextProps } from "@/services/text/renderText";
import type { LayerEffect } from "@/types/effects";

const NAV: { id: SidebarPanel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "groups", label: "Groups", icon: FolderTree },
  { id: "magic", label: "Magic Cut", icon: Wand2 },
  { id: "animation", label: "Animation", icon: Film },
  { id: "brush", label: "Brush", icon: Brush },
  { id: "text", label: "Text", icon: Type },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "shakes", label: "Shakes", icon: Waves },
  { id: "transitions", label: "Transitions", icon: Shuffle },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Settings", icon: Settings },
];

const PANEL_HINTS: Record<SidebarPanel, string> = {
  projects: "Start, rename, and inspect the current project.",
  assets: "Import images or video into the canvas.",
  layers: "Select, reorder, duplicate, hide, or lock layers.",
  groups: "Group selected layers for organized rigs.",
  magic: "Cut characters into editable animated parts.",
  animation: "Apply presets and tune keyframes.",
  brush: "Pick brush, eraser, pen, or lasso presets.",
  text: "Create raster text layers that export like artwork.",
  effects: "Add non-destructive effects to the selected layer.",
  shakes: "Apply camera and impact shake presets.",
  transitions: "Add transition keyframes at the playhead.",
  audio: "Prepare audio analysis and beat tools.",
  export: "Render the project to shareable formats.",
  settings: "Adjust canvas size, FPS, and duration.",
};

export function LeftSidebar() {
  const panel = useEditor((s) => s.sidebarPanel);
  const setPanel = useEditor((s) => s.setSidebarPanel);

  return (
    <aside className="flex h-full shrink-0">
      <nav className="w-14 shrink-0 flex flex-col items-center gap-1 py-3 border-r border-border bg-panel/40">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = panel === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setPanel(n.id)}
              className={cn(
                "group relative w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground transition",
                "hover:bg-surface-2 hover:text-foreground",
                active && "text-primary bg-primary/10",
              )}
              title={n.label}
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary shadow-[0_0_10px_var(--primary-glow)]"
                />
              )}
              <Icon className="w-[18px] h-[18px]" />
              <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden min-w-52 rounded-md border border-border bg-popover px-2 py-1.5 text-left shadow-panel group-hover:block z-[100]">
                <span className="block text-[11px] font-medium text-popover-foreground">{n.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{PANEL_HINTS[n.id]}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="w-72 lg:w-80 shrink-0 border-r border-border bg-panel/60 backdrop-blur flex flex-col">
        <div className="min-h-14 shrink-0 flex flex-col justify-center gap-0.5 px-3 border-b border-border">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {NAV.find((n) => n.id === panel)?.label}
          </h2>
          <p className="text-[10px] leading-snug text-muted-foreground/80">
            {PANEL_HINTS[panel]}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-3"
            >
              {panel === "layers" && <LayersPanel />}
              {panel === "assets" && <AssetsPanel />}
              {panel === "projects" && <ProjectsPanel />}
              {panel === "groups" && <GroupsPanel />}
              {panel === "magic" && <MagicCutPanel />}
              {panel === "animation" && <AnimationPanel />}
              {panel === "brush" && <BrushPanel />}
              {panel === "text" && <TextPanel />}
              {panel === "effects" && <EffectsPanel />}
              {panel === "shakes" && <ShakesPanel />}
              {panel === "transitions" && <TransitionsPanel />}
              {panel === "audio" && <AudioPanel />}
              {panel === "export" && <ExportPanel />}
              {panel === "settings" && <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}

function BrushPanel() {
  const activeTool = useEditor((s) => s.activeTool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {BUILTIN_BRUSH_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setTool(preset.tool)}
            className={cn(
              "rounded-md border px-2 py-2 text-left transition",
              activeTool === preset.tool
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-surface-2/40 hover:border-border-strong",
            )}
            title={`${preset.name} · ${preset.params.size}px`}
          >
            <div className="text-xs font-medium">{preset.name}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{preset.tool} · {preset.params.size}px</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Brush presets now live in the MotionCut rail. Stroke committing will be wired into selected layer masks next.</p>
    </div>
  );
}

function TextPanel() {
  const addImageLayer = useEditor((s) => s.addImageLayer);
  const setTool = useEditor((s) => s.setTool);

  const addText = (props: TextProps) => {
    const rendered = renderText(props);
    addImageLayer("Text", rendered.src, rendered.width, rendered.height, {
      text: props,
      y: -120,
    });
    setTool("text");
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => addText({ ...DEFAULT_TEXT_PROPS })}
        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/20"
      >
        <Plus className="w-4 h-4" /> Add text layer
      </button>
      <div className="grid grid-cols-1 gap-1.5">
        {[
          { content: "MOTIONCUT", fontFamily: "Impact", fontSize: 104, bold: false, color: "#ffffff" },
          { content: "New Scene", fontFamily: "Georgia", fontSize: 88, italic: true, color: "#f6d365" },
          { content: "SFX!", fontFamily: "Arial", fontSize: 120, bold: true, color: "#4dd4d4" },
        ].map((patch) => (
          <button
            key={patch.content}
            onClick={() => addText({ ...DEFAULT_TEXT_PROPS, ...patch })}
            className="rounded-md border border-border bg-surface-2/40 px-2 py-2 text-left hover:border-primary/40"
          >
            <div className="text-xs font-medium">{patch.content}</div>
            <div className="text-[10px] text-muted-foreground">{patch.fontFamily} · {patch.fontSize}px</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShakesPanel() {
  const selectedId = useEditor((s) => s.selectedIds[0]);
  const layer = useEditor((s) => s.project.layers.find((l) => l.id === selectedId));
  const updateLayer = useEditor((s) => s.updateLayer);
  const pushHistory = useEditor((s) => s.pushHistory);
  const setSelectedEffect = useEditor((s) => s.setSelectedEffect);

  const shakeIndex = layer?.effects?.findIndex((effect) => effect.kind === "shake") ?? -1;
  const activeShake = shakeIndex >= 0 ? layer?.effects?.[shakeIndex] : undefined;

  const applyShake = (preset: (typeof BUILTIN_SHAKES)[number]) => {
    if (!layer || layer.kind !== "image") return;
    const nonShakeEffects = (layer.effects ?? []).filter((effect) => effect.kind !== "shake");

    if (activeShake?.kind === "shake" && activeShake.presetId === preset.id && shakeIndex >= 0) {
      pushHistory();
      updateLayer(layer.id, { effects: nonShakeEffects });
      setSelectedEffect(null);
      return;
    }

    const shakeEffect: LayerEffect = {
      kind: "shake",
      enabled: true,
      presetId: preset.id,
      profile: preset.params.profile,
      intensity: preset.params.intensity,
      speed: preset.params.speed,
      amplitude: Math.max(preset.params.x, preset.params.y) * preset.params.intensity,
      frequency: preset.params.frequency * preset.params.speed,
      randomness: preset.params.randomness,
      x: preset.params.x,
      y: preset.params.y,
      rotation: preset.params.rotation,
      rotational: (preset.params.rotation * 180) / Math.PI,
      scale: preset.params.scale,
      decay: preset.params.decay,
      seed: preset.params.seed,
      easing: preset.params.easing,
    };
    pushHistory();
    updateLayer(layer.id, { effects: [...nonShakeEffects, shakeEffect] });
    setSelectedEffect({ layerId: layer.id, index: nonShakeEffects.length });
  };

  return (
    <div className="space-y-3">
      {!layer && <p className="text-[11px] text-muted-foreground">Select a layer, then apply a shake preset.</p>}
      <div className="grid grid-cols-2 gap-1.5">
        {BUILTIN_SHAKES.map((preset) => (
          <button
            key={preset.id}
            disabled={!layer}
            onClick={() => applyShake(preset)}
            className={cn(
              "relative rounded-md border px-2 py-2 text-left text-xs transition disabled:opacity-40",
              activeShake?.kind === "shake" && activeShake.presetId === preset.id
                ? "border-primary bg-primary/20 text-foreground shadow-[0_0_12px_-6px_var(--primary-glow)]"
                : "border-border bg-surface-2/40 hover:border-primary/40",
            )}
            title={activeShake?.kind === "shake" && activeShake.presetId === preset.id ? "Click to turn this shake off" : preset.tags?.join(", ")}
          >
            {activeShake?.kind === "shake" && activeShake.presetId === preset.id && (
              <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">{preset.name}</span>
              {activeShake?.kind === "shake" && activeShake.presetId === preset.id && (
                <span className="ml-auto rounded-sm bg-primary px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                  On
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">{preset.params.frequency}hz · {preset.params.x}/{preset.params.y}px</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TransitionsPanel() {
  const selectedId = useEditor((s) => s.selectedIds[0]);
  const layer = useEditor((s) => s.project.layers.find((l) => l.id === selectedId));
  const currentFrame = useEditor((s) => s.currentFrame);
  const fps = useEditor((s) => s.fps);
  const setKeyframe = useEditor((s) => s.setKeyframe);
  const addEffect = useEditor((s) => s.addEffect);
  const updateEffect = useEditor((s) => s.updateEffect);

  const applyTransition = (preset: (typeof BUILTIN_TRANSITIONS)[number]) => {
    if (!layer || layer.kind !== "image") return;
    const start = TransitionEngine.evaluate(preset.id, 0);
    const end = TransitionEngine.evaluate(preset.id, 1);
    const durationFrames = Math.max(1, Math.round(preset.params.duration * fps));
    setKeyframe(layer.id, "opacity", currentFrame, layer.opacity * start.opacity);
    setKeyframe(layer.id, "opacity", currentFrame + durationFrames, layer.opacity * end.opacity);
    if (start.translateX || end.translateX) {
      setKeyframe(layer.id, "x", currentFrame, layer.x + start.translateX);
      setKeyframe(layer.id, "x", currentFrame + durationFrames, layer.x + end.translateX);
    }
    if (start.translateY || end.translateY) {
      setKeyframe(layer.id, "y", currentFrame, layer.y + start.translateY);
      setKeyframe(layer.id, "y", currentFrame + durationFrames, layer.y + end.translateY);
    }
    if (start.scaleX !== 1 || end.scaleX !== 1) {
      setKeyframe(layer.id, "scaleX", currentFrame, layer.scaleX * start.scaleX);
      setKeyframe(layer.id, "scaleX", currentFrame + durationFrames, layer.scaleX * end.scaleX);
    }
    if (start.scaleY !== 1 || end.scaleY !== 1) {
      setKeyframe(layer.id, "scaleY", currentFrame, layer.scaleY * start.scaleY);
      setKeyframe(layer.id, "scaleY", currentFrame + durationFrames, layer.scaleY * end.scaleY);
    }
    if (start.blur > 0) {
      addEffect(layer.id, "motionBlur");
      const nextLayer = useEditor.getState().project.layers.find((l) => l.id === layer.id);
      updateEffect(layer.id, (nextLayer?.effects?.length ?? 1) - 1, { amount: start.blur });
    }
  };

  return (
    <div className="space-y-3">
      {!layer && <p className="text-[11px] text-muted-foreground">Select a layer, then apply a transition at the playhead.</p>}
      <div className="grid grid-cols-2 gap-1.5">
        {BUILTIN_TRANSITIONS.map((preset) => (
          <button
            key={preset.id}
            disabled={!layer}
            onClick={() => applyTransition(preset)}
            className="rounded-md border border-border bg-surface-2/40 px-2 py-2 text-left text-xs hover:border-primary/40 disabled:opacity-40"
          >
            <div className="font-medium">{preset.name}</div>
            <div className="text-[10px] text-muted-foreground">{preset.params.duration}s · {preset.params.direction}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AudioPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-2/40 p-3">
        <div className="text-xs font-medium">Audio engine ready</div>
        <p className="mt-1 text-[11px] text-muted-foreground">Waveform analysis, beat detection and gain controls are imported. The next integration step is adding project-owned audio tracks to editorStore.</p>
      </div>
    </div>
  );
}

function AssetsPanel() {
  const addImageLayer = useEditor((s) => s.addImageLayer);
  const addVideoLayer = useEditor((s) => s.addVideoLayer);
  const setTotalFrames = useEditor((s) => s.setTotalFrames);
  const fps = useEditor((s) => s.fps);
  const totalFrames = useEditor((s) => s.totalFrames);

  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => addImageLayer(file.name.replace(/\.[^.]+$/, ""), dataUrl, img.width, img.height);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.onloadedmetadata = () => {
      addVideoLayer(
        file.name.replace(/\.[^.]+$/, ""),
        url,
        v.videoWidth || 1280,
        v.videoHeight || 720,
        v.duration || 5,
      );
      // Auto-extend timeline to match video length
      const needed = Math.ceil((v.duration || 5) * fps);
      if (needed > totalFrames) setTotalFrames(needed);
    };
  };

  const onFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.type.startsWith("video/")) handleVideo(file);
      else handleImage(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/quicktime": [".mov"],
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl border border-dashed border-border-strong p-6 text-center cursor-pointer transition",
          "hover:border-primary/60 hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/10",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center mb-2">
          <Upload className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium">Drop image or video</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">PNG · JPG · WebP · MP4 · WebM · MOV</p>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Video className="w-3 h-3" /> Videos sync to the timeline playhead — scrub to preview.
      </div>
    </div>
  );
}

function LayersPanel() {
  const project = useEditor((s) => s.project);
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const toggleLocked = useEditor((s) => s.toggleLocked);
  const removeLayers = useEditor((s) => s.removeLayers);
  const duplicateLayers = useEditor((s) => s.duplicateLayers);
  const reorderLayer = useEditor((s) => s.reorderLayer);
  const renameLayer = useEditor((s) => s.renameLayer);
  const [editing, setEditing] = useState<string | null>(null);

  const ordered = [...project.order].reverse().map((id) => project.layers.find((l) => l.id === id)!).filter(Boolean);

  if (ordered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Layers className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">No layers yet. Import an image or video from Assets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {ordered.map((layer) => {
        const selected = selectedIds.includes(layer.id);
        return (
          <div
            key={layer.id}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) {
                select(selected ? selectedIds.filter((i) => i !== layer.id) : [...selectedIds, layer.id]);
              } else {
                select([layer.id]);
              }
            }}
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border border-transparent",
              "hover:bg-surface-2",
              selected && "bg-primary/10 border-primary/40",
            )}
          >
            <div className="w-8 h-8 rounded-md checker-bg overflow-hidden shrink-0 border border-border flex items-center justify-center">
              {layer.mediaType === "video" ? (
                <Video className="w-3.5 h-3.5 text-accent" />
              ) : layer.src ? (
                <img src={layer.src} alt="" className="w-full h-full object-contain" />
              ) : (
                <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editing === layer.id ? (
                <input
                  autoFocus
                  defaultValue={layer.name}
                  onBlur={(e) => { renameLayer(layer.id, e.target.value || layer.name); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="w-full bg-transparent text-xs outline-none border-b border-primary/60"
                />
              ) : (
                <div onDoubleClick={() => setEditing(layer.id)} className="text-xs truncate">
                  {layer.name}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">{Math.round(layer.width)}×{Math.round(layer.height)}</div>
            </div>
            <div className="flex items-center opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
              <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7" onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, "up"); }} title="Move up">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7" onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, "down"); }} title="Move down">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7" onClick={(e) => { e.stopPropagation(); duplicateLayers([layer.id]); }} title="Duplicate">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7 hover:!text-destructive" onClick={(e) => { e.stopPropagation(); removeLayers([layer.id]); }} title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7" onClick={(e) => { e.stopPropagation(); toggleLocked(layer.id); }} title={layer.locked ? "Unlock" : "Lock"}>
              {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-40" />}
            </button>
            <button className="tool-btn !w-8 !h-8 xl:!w-7 xl:!h-7" onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }} title={layer.visible ? "Hide" : "Show"}>
              {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-40" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function GroupsPanel() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const createGroup = useEditor((s) => s.createGroup);
  const project = useEditor((s) => s.project);
  const groups = project.layers.filter((l) => l.kind === "group");

  return (
    <div className="space-y-3">
      <button
        onClick={() => createGroup(selectedIds, "New Group")}
        disabled={selectedIds.length === 0}
        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs font-medium disabled:opacity-40 hover:bg-primary/20"
      >
        <Plus className="w-4 h-4" /> Group selection ({selectedIds.length})
      </button>
      {groups.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Select layers and group them. Magic Cut auto-creates rigged part groups.</p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li key={g.id} className="px-2 py-1.5 rounded-md bg-surface-2 text-xs flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5 text-accent" /> {g.name}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {project.layers.filter((l) => l.parentId === g.id).length} items
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectsPanel() {
  const project = useEditor((s) => s.project);
  const newProject = useEditor((s) => s.newProject);
  return (
    <div className="space-y-3">
      <button
        onClick={() => newProject("Untitled Project")}
        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/20"
      >
        <Plus className="w-4 h-4" /> New project
      </button>
      <div className="rounded-lg border border-border bg-surface-2/50 p-3">
        <div className="text-xs font-medium">{project.name}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {project.layers.length} layers · {project.canvasWidth}×{project.canvasHeight} · updated {new Date(project.updatedAt).toLocaleTimeString()}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Projects auto-save locally.</p>
    </div>
  );
}

function SettingsPanel() {
  const project = useEditor((s) => s.project);
  const setCanvasSize = useEditor((s) => s.setCanvasSize);
  const fps = useEditor((s) => s.fps);
  const setFps = useEditor((s) => s.setFps);
  const totalFrames = useEditor((s) => s.totalFrames);
  const setTotalFrames = useEditor((s) => s.setTotalFrames);

  const presets: [string, number, number][] = [
    ["TikTok 9:16", 1080, 1920],
    ["Square", 1080, 1080],
    ["YouTube 16:9", 1920, 1080],
    ["Manga panel", 1200, 1600],
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Canvas presets</div>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map(([label, w, h]) => (
            <button
              key={label}
              onClick={() => setCanvasSize(w, h)}
              className={cn(
                "px-2 py-1.5 rounded-md border text-[11px] text-left",
                project.canvasWidth === w && project.canvasHeight === h
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-surface-2/40 hover:border-border-strong",
              )}
            >
              <div className="font-medium">{label}</div>
              <div className="text-[10px] text-muted-foreground">{w}×{h}</div>
            </button>
          ))}
        </div>
      </div>
      <NumRow label="Width" value={project.canvasWidth} onChange={(v) => setCanvasSize(v, project.canvasHeight)} />
      <NumRow label="Height" value={project.canvasHeight} onChange={(v) => setCanvasSize(project.canvasWidth, v)} />
      <NumRow label="FPS" value={fps} onChange={setFps} />
      <NumRow label="Total frames" value={totalFrames} onChange={setTotalFrames} />
    </div>
  );
}

function NumRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-surface-2/40 px-2.5 h-9">
      <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-20 bg-transparent text-xs outline-none text-right font-mono"
      />
    </label>
  );
}
