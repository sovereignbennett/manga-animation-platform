import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban, Image as ImageIcon, Layers, FolderTree, Film,
  Sparkles, Download, Settings, Eye, EyeOff, Lock, Unlock, Trash2, Copy,
  ChevronUp, ChevronDown, Plus, Upload, Wand2, Video,
} from "lucide-react";
import { useEditor, type SidebarPanel } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { MagicCutPanel } from "./MagicCutPanel";
import { AnimationPanel } from "./AnimationPanel";
import { EffectsPanel } from "./EffectsPanel";
import { ExportPanel } from "./ExportPanel";

const NAV: { id: SidebarPanel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "groups", label: "Groups", icon: FolderTree },
  { id: "magic", label: "Magic Cut", icon: Wand2 },
  { id: "animation", label: "Animation", icon: Film },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Settings", icon: Settings },
];

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
                "relative w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground transition",
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
            </button>
          );
        })}
      </nav>

      <div className="w-72 lg:w-80 shrink-0 border-r border-border bg-panel/60 backdrop-blur flex flex-col">
        <div className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-border">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {NAV.find((n) => n.id === panel)?.label}
          </h2>
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
              {panel === "effects" && <EffectsPanel />}
              {panel === "export" && <ExportPanel />}
              {panel === "settings" && <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </aside>
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
