import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Image as ImageIcon,
  Layers,
  FolderTree,
  Film,
  Sparkles,
  Download,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  Upload,
  Wand2,
} from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { MagicCutPanel } from "./MagicCutPanel";

type PanelId =
  | "projects"
  | "assets"
  | "layers"
  | "groups"
  | "magic"
  | "animation"
  | "effects"
  | "export"
  | "settings";

const NAV: { id: PanelId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
  const [panel, setPanel] = useState<PanelId>("layers");

  return (
    <aside className="flex h-full shrink-0">
      {/* Icon rail */}
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

      {/* Panel body */}
      <div className="w-72 shrink-0 border-r border-border bg-panel/60 backdrop-blur flex flex-col">
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
              {panel === "animation" && (
                <PlaceholderPanel
                  title="Animation"
                  desc="Keyframes, curves and presets. Configure per-layer animation from the timeline below."
                />
              )}
              {panel === "effects" && (
                <PlaceholderPanel
                  title="Effects"
                  desc="Glow, RGB split, motion blur, camera shake, impact frames — coming in Phase 4."
                />
              )}
              {panel === "export" && (
                <PlaceholderPanel
                  title="Export"
                  desc="PNG, transparent PNG, MP4, GIF and sprite sheet — coming in Phase 5."
                />
              )}
              {panel === "settings" && (
                <PlaceholderPanel title="Settings" desc="Canvas size, FPS, keyboard shortcuts." />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}

function AssetsPanel() {
  const addImageLayer = useEditor((s) => s.addImageLayer);

  const onFiles = (files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () =>
          addImageLayer(file.name.replace(/\.[^.]+$/, ""), dataUrl, img.width, img.height);
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
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
        <p className="text-xs font-medium">Drop PNG or JPG</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">or click to browse</p>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Uploaded images become editable layers on the canvas. Transparency is preserved for PNG.
      </p>
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

  // Show top -> bottom (top of z-stack first)
  const ordered = [...project.order]
    .reverse()
    .map((id) => project.layers.find((l) => l.id === id)!)
    .filter(Boolean);

  if (ordered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Layers className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">No layers yet. Import an image from Assets.</p>
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
                select(
                  selected ? selectedIds.filter((i) => i !== layer.id) : [...selectedIds, layer.id],
                );
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
            <div className="w-8 h-8 rounded-md checker-bg overflow-hidden shrink-0 border border-border">
              {layer.src && <img src={layer.src} alt="" className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 min-w-0">
              {editing === layer.id ? (
                <input
                  autoFocus
                  defaultValue={layer.name}
                  onBlur={(e) => {
                    renameLayer(layer.id, e.target.value || layer.name);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full bg-transparent text-xs outline-none border-b border-primary/60"
                />
              ) : (
                <div onDoubleClick={() => setEditing(layer.id)} className="text-xs truncate">
                  {layer.name}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">
                {Math.round(layer.width)}×{Math.round(layer.height)}
              </div>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="tool-btn !w-7 !h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  reorderLayer(layer.id, "up");
                }}
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                className="tool-btn !w-7 !h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  reorderLayer(layer.id, "down");
                }}
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                className="tool-btn !w-7 !h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateLayers([layer.id]);
                }}
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                className="tool-btn !w-7 !h-7 hover:!text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayers([layer.id]);
                }}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              className="tool-btn !w-7 !h-7"
              onClick={(e) => {
                e.stopPropagation();
                toggleLocked(layer.id);
              }}
              title={layer.locked ? "Unlock" : "Lock"}
            >
              {layer.locked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5 opacity-40" />
              )}
            </button>
            <button
              className="tool-btn !w-7 !h-7"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisible(layer.id);
              }}
              title={layer.visible ? "Hide" : "Show"}
            >
              {layer.visible ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 opacity-40" />
              )}
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
        <p className="text-[11px] text-muted-foreground">
          Select layers and group them. Anime-part groups (Head, Hair, Torso…) will auto-populate
          when Magic Cut runs in Phase 2.
        </p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li
              key={g.id}
              className="px-2 py-1.5 rounded-md bg-surface-2 text-xs flex items-center gap-2"
            >
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
          {project.layers.length} layers · updated{" "}
          {new Date(project.updatedAt).toLocaleTimeString()}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Projects auto-save locally. Cloud sync arrives with the AI features.
      </p>
    </div>
  );
}

function PlaceholderPanel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <h3 className="text-xs font-semibold mb-1">{title}</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
