import { useState } from "react";
import { motion } from "framer-motion";
import {
  MousePointer2, Move, RotateCw, Maximize2, Brush, Eraser,
  Lasso, PenTool, Wand2, Camera, Download, Undo2, Redo2, Sparkles,
  Plus, Wand, Type,
} from "lucide-react";
import { useEditor, type ToolId } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { ToolOptionsBar } from "./ToolOptionsBar";

const TOOLS: { id: ToolId; icon: React.ComponentType<{ className?: string }>; label: string; key: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", key: "V" },
  { id: "move",   icon: Move,          label: "Move",   key: "M" },
  { id: "rotate", icon: RotateCw,      label: "Rotate", key: "R" },
  { id: "scale",  icon: Maximize2,     label: "Scale",  key: "S" },
  { id: "brush",  icon: Brush,         label: "Brush",  key: "B" },
  { id: "eraser", icon: Eraser,        label: "Eraser", key: "E" },
  { id: "lasso",  icon: Lasso,         label: "Lasso",  key: "L" },
  { id: "pen",    icon: PenTool,       label: "Pen",    key: "P" },
  { id: "text",   icon: Type,          label: "Text",   key: "T" },
  { id: "magic",  icon: Wand2,         label: "Magic Cut", key: "W" },
  { id: "camera", icon: Camera,        label: "Camera", key: "C" },
];

export function TopToolbar() {
  const activeTool = useEditor((s) => s.activeTool);
  const setTool = useEditor((s) => s.setTool);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const projectName = useEditor((s) => s.project.name);
  const setSidebarPanel = useEditor((s) => s.setSidebarPanel);
  const newProject = useEditor((s) => s.newProject);
  const project = useEditor((s) => s.project);
  const [editingName, setEditingName] = useState(false);

  const onTool = (id: ToolId) => {
    setTool(id);
    if (id === "magic") setSidebarPanel("magic");
  };

  const renameProject = (name: string) => {
    // update project via addImageLayer trick? We'll go directly through set.
    useEditor.setState({ project: { ...project, name: name.trim() || project.name, updatedAt: Date.now() } });
  };

  return (
    <>
    <header className="h-14 shrink-0 flex items-center gap-3 px-3 border-b border-border bg-panel/60 backdrop-blur">

      <button
        onClick={() => setSidebarPanel("projects")}
        className="flex items-center gap-2 pr-3 border-r border-border hover:opacity-80 transition"
        title="Projects"
      >
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_24px_-4px_var(--primary-glow)]">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="leading-tight text-left">
          <div className="text-[13px] font-semibold font-display tracking-tight">MotionCut</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Studio</div>
        </div>
      </button>

      <div className="flex items-center gap-1 px-1 rounded-lg bg-surface/60 border border-border">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTool(t.id)}
              className={cn("tool-btn relative group", isActive && "tool-btn-active")}
              title={`${t.label} (${t.key})`}
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <motion.span
                  layoutId="tool-underline"
                  className="absolute -bottom-0.5 left-1.5 right-1.5 h-[2px] rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]"
                />
              )}
              <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-100 border border-border shadow-panel z-[100]">
                {t.label} <kbd className="ml-1 px-1 rounded bg-surface-2 text-muted-foreground text-[10px]">{t.key}</kbd>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <button className="tool-btn" title="Undo (⌘Z)" onClick={undo}><Undo2 className="w-4 h-4" /></button>
        <button className="tool-btn" title="Redo (⌘⇧Z)" onClick={redo}><Redo2 className="w-4 h-4" /></button>
        <button className="tool-btn" title="New project" onClick={() => newProject("Untitled Project")}><Plus className="w-4 h-4" /></button>
        <button className="tool-btn" title="Magic Cut panel" onClick={() => setSidebarPanel("magic")}><Wand className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="px-3 py-1.5 rounded-md bg-surface/60 border border-border text-xs text-muted-foreground flex items-center gap-2">
          {editingName ? (
            <input
              autoFocus
              defaultValue={projectName}
              onBlur={(e) => { renameProject(e.target.value); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="bg-transparent text-foreground/80 font-medium outline-none border-b border-primary/60 min-w-[160px]"
            />
          ) : (
            <button
              onDoubleClick={() => setEditingName(true)}
              onClick={() => setEditingName(true)}
              className="text-foreground/80 font-medium hover:text-foreground"
              title="Double-click to rename"
            >
              {projectName}
            </button>
          )}
          <span className="text-[10px] uppercase tracking-wider text-accent">● Autosaved</span>
        </div>
      </div>

      <button
        onClick={() => setSidebarPanel("export")}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-xs font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_24px_-6px_var(--primary-glow)] hover:brightness-110 transition"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
    </header>
    <ToolOptionsBar />
    </>
  );
}

