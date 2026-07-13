import { useEffect } from "react";
import { useEditor } from "@/store/editorStore";

export function useCanvasViewportControls(hostRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    let isPanning = false;
    let spaceDown = false;
    let last = { x: 0, y: 0 };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceDown = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceDown = false;
    };
    const onDown = (event: MouseEvent) => {
      if (event.button !== 1 && !spaceDown) return;
      isPanning = true;
      last = { x: event.clientX, y: event.clientY };
      element.style.cursor = "grabbing";
      event.preventDefault();
    };
    const onMove = (event: MouseEvent) => {
      if (!isPanning) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      const state = useEditor.getState();
      state.setPan({ x: state.pan.x + dx, y: state.pan.y + dy });
    };
    const onUp = () => {
      isPanning = false;
      element.style.cursor = "";
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = useEditor.getState();
      state.setZoom(state.zoom * (event.deltaY < 0 ? 1.1 : 0.9));
    };

    element.addEventListener("mousedown", onDown);
    element.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      element.removeEventListener("mousedown", onDown);
      element.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [hostRef]);
}
