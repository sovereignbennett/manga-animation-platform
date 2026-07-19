import { useEffect } from "react";
import { useEditor, type ToolId } from "@/store/editorStore";

const TOOL_KEYS: Record<string, ToolId> = {
  v: "select", m: "move", r: "rotate", s: "scale",
  b: "brush", e: "eraser", l: "lasso", p: "pen",
  t: "text", w: "magic", c: "camera",
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const meta = e.metaKey || e.ctrlKey;
      const s = useEditor.getState();

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo(); else s.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); s.redo(); return; }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.duplicateLayers(s.selectedIds);
        return;
      }
      if (meta && e.key.toLowerCase() === "g") {
        e.preventDefault();
        s.createGroup(s.selectedIds);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selectedIds.length) { e.preventDefault(); s.removeLayers(s.selectedIds); }
        return;
      }
      if (e.code === "Space") { e.preventDefault(); (s.playing ? s.pause() : s.play()); return; }

      const k = e.key.toLowerCase();
      if (TOOL_KEYS[k] && !meta) {
        e.preventDefault();
        s.setTool(TOOL_KEYS[k]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
