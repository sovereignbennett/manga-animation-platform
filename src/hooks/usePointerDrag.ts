import { useCallback, useRef } from "react";

export interface DragState {
  startX: number; startY: number;
  x: number; y: number;
  dx: number; dy: number;
}

export interface DragHandlers {
  onStart?: (s: DragState, e: PointerEvent) => void;
  onMove?: (s: DragState, e: PointerEvent) => void;
  onEnd?: (s: DragState, e: PointerEvent) => void;
}

/**
 * Attach pointer-drag handlers to any element via the returned callback.
 * Works with mouse, pen and touch through the pointer events API.
 */
export function usePointerDrag(handlers: DragHandlers) {
  const stateRef = useRef<DragState | null>(null);
  const hRef = useRef(handlers);
  hRef.current = handlers;

  return useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const start: DragState = { startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    stateRef.current = start;
    hRef.current.onStart?.(start, e.nativeEvent);

    const move = (ev: PointerEvent) => {
      const s = stateRef.current;
      if (!s) return;
      s.x = ev.clientX; s.y = ev.clientY;
      s.dx = ev.clientX - s.startX; s.dy = ev.clientY - s.startY;
      hRef.current.onMove?.(s, ev);
    };
    const up = (ev: PointerEvent) => {
      const s = stateRef.current;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (s) hRef.current.onEnd?.(s, ev);
      stateRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, []);
}
