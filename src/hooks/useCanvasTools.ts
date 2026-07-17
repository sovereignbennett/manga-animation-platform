import { useEffect } from "react";
import { useEditor, type Layer, sampleLayer } from "@/store/editorStore";
import { applyBrushStroke } from "@/services/masking/maskOps";

interface Pt { x: number; y: number }

/** Convert screen event coords to content-space (Pixi world at zoom=1, origin=canvas center). */
function screenToContent(el: HTMLElement, e: { clientX: number; clientY: number }): Pt {
  const rect = el.getBoundingClientRect();
  const s = useEditor.getState();
  const cx = rect.width / 2 + s.pan.x;
  const cy = rect.height / 2 + s.pan.y;
  return {
    x: (e.clientX - rect.left - cx) / s.zoom,
    y: (e.clientY - rect.top - cy) / s.zoom,
  };
}

/** Local pixel coordinates on the layer's source bitmap. */
function contentToLayerLocal(layer: Layer, p: Pt): Pt {
  const dx = p.x - layer.x;
  const dy = p.y - layer.y;
  const r = -(layer.rotation * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return {
    x: rx / (layer.scaleX || 1) + layer.anchorX * layer.width,
    y: ry / (layer.scaleY || 1) + layer.anchorY * layer.height,
  };
}

/** Test whether content-space point p is inside layer's oriented bounding box. */
function hitTest(layer: Layer, p: Pt): boolean {
  if (!layer.visible || layer.locked || layer.kind !== "image" || !layer.width || !layer.height) return false;
  const local = contentToLayerLocal(layer, p);
  return local.x >= 0 && local.x <= layer.width && local.y >= 0 && local.y <= layer.height;
}

function topLayerAt(p: Pt): Layer | null {
  const s = useEditor.getState();
  const order = s.project.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const l = s.project.layers.find((x) => x.id === order[i]);
    if (!l) continue;
    const sampled = sampleLayer(l, s.currentFrame);
    if (hitTest(sampled, p)) return l;
  }
  return null;
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface CanvasToolsApi {
  onOverlayDraw?: (draw: (ctx: CanvasRenderingContext2D) => void) => void;
}

/**
 * Attach mouse handlers to the canvas host that drive interactive editing
 * tools (select / move / rotate / scale / lasso / brush / eraser / magic /
 * pen / camera). Pan (Space + drag / middle-click) is handled inside
 * CanvasStage itself and is not touched here.
 */
export function useCanvasTools(
  hostRef: React.RefObject<HTMLDivElement | null>,
  overlayRef: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let dragging = false;
    let mode: null | "move" | "rotate" | "scale" | "lasso" | "brush" | "eraser" | "pen" | "marquee" = null;
    let start: Pt = { x: 0, y: 0 };
    let startLayer: Layer | null = null;
    let polyPoints: Pt[] = [];
    let brushStroke: Pt[] = [];

    const drawOverlay = () => {
      const c = overlayRef.current;
      if (!c) return;
      const rect = el.getBoundingClientRect();
      c.width = rect.width * window.devicePixelRatio;
      c.height = rect.height * window.devicePixelRatio;
      c.style.width = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const s = useEditor.getState();
      const cx = rect.width / 2 + s.pan.x;
      const cy = rect.height / 2 + s.pan.y;

      // selection outline
      for (const id of s.selectedIds) {
        const raw = s.project.layers.find((l) => l.id === id);
        if (!raw || raw.kind !== "image") continue;
        const l = sampleLayer(raw, s.currentFrame);
        const w = l.width * l.scaleX;
        const h = l.height * l.scaleY;
        ctx.save();
        ctx.translate(cx + l.x * s.zoom, cy + l.y * s.zoom);
        ctx.rotate((l.rotation * Math.PI) / 180);
        ctx.scale(s.zoom, s.zoom);
        ctx.strokeStyle = "#d44dc9";
        ctx.lineWidth = 1.5 / s.zoom;
        ctx.setLineDash([6 / s.zoom, 4 / s.zoom]);
        ctx.strokeRect(-l.anchorX * w, -l.anchorY * h, w, h);
        ctx.setLineDash([]);
        // pivot dot
        ctx.fillStyle = "#4dd4d4";
        ctx.beginPath();
        ctx.arc(0, 0, 4 / s.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // active lasso / pen polyline
      if ((mode === "lasso" || mode === "pen") && polyPoints.length > 1) {
        ctx.beginPath();
        polyPoints.forEach((p, i) => {
          const sx = cx + p.x * s.zoom;
          const sy = cy + p.y * s.zoom;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        if (mode === "lasso") ctx.closePath();
        ctx.strokeStyle = mode === "lasso" ? "#d44dc9" : "#4dd4d4";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // marquee rect
      if (mode === "marquee") {
        const x0 = cx + start.x * s.zoom;
        const y0 = cy + start.y * s.zoom;
        const now = polyPoints[polyPoints.length - 1];
        if (now) {
          const x1 = cx + now.x * s.zoom;
          const y1 = cy + now.y * s.zoom;
          ctx.strokeStyle = "#d44dc9";
          ctx.fillStyle = "rgba(212,77,201,0.08)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
          ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
          ctx.setLineDash([]);
        }
      }
    };

    let rafId = 0;
    const scheduleOverlay = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; drawOverlay(); });
    };

    const unsub = useEditor.subscribe(
      (s) => ({ z: s.zoom, p: s.pan, sel: s.selectedIds, ord: s.project.order, f: s.currentFrame, layers: s.project.layers }),
      scheduleOverlay,
    );

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Pan handled by CanvasStage when space is held
      if ((e as MouseEvent & { _panning?: boolean })._panning) return;
      const target = e.target as HTMLElement;
      if (target !== el && !el.contains(target)) return;
      // Don't hijack space-pan (CanvasStage sets cursor grabbing)
      if (el.style.cursor === "grabbing") return;

      const s = useEditor.getState();
      const tool = s.activeTool;
      const p = screenToContent(el, e);
      start = p;
      polyPoints = [p];
      brushStroke = [p];

      if (tool === "camera") return; // pan handled elsewhere; camera = default view drag

      if (tool === "select") {
        const hit = topLayerAt(p);
        if (hit) {
          const nextSel = e.shiftKey ? Array.from(new Set([...s.selectedIds, hit.id])) : [hit.id];
          s.select(nextSel);
        } else {
          if (!e.shiftKey) s.select([]);
          mode = "marquee";
          dragging = true;
          e.preventDefault();
          return;
        }
        return;
      }

      if (tool === "magic") {
        const hit = topLayerAt(p);
        if (hit) {
          s.select([hit.id]);
          s.setSidebarPanel("magic");
        }
        return;
      }

      if (tool === "lasso") {
        s.select([]);
        mode = "lasso";
        dragging = true;
        e.preventDefault();
        return;
      }

      if (tool === "pen") {
        mode = "pen";
        dragging = true;
        e.preventDefault();
        return;
      }

      // Transform tools require a selected layer (fallback: pick under cursor)
      let target2 = s.project.layers.find((l) => s.selectedIds.includes(l.id) && l.kind === "image") ?? null;
      if (!target2) {
        const hit = topLayerAt(p);
        if (hit) {
          s.select([hit.id]);
          target2 = hit;
        }
      }
      if (!target2) return;
      startLayer = { ...target2 };

      if (tool === "move") { mode = "move"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
      if (tool === "rotate") { mode = "rotate"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
      if (tool === "scale") { mode = "scale"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
      if (tool === "brush" || tool === "eraser") {
        mode = tool;
        dragging = true;
        e.preventDefault();
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const p = screenToContent(el, e);
      const s = useEditor.getState();

      if (mode === "move" && startLayer) {
        s.updateLayer(startLayer.id, { x: startLayer.x + (p.x - start.x), y: startLayer.y + (p.y - start.y) });
      } else if (mode === "rotate" && startLayer) {
        const a0 = Math.atan2(start.y - startLayer.y, start.x - startLayer.x);
        const a1 = Math.atan2(p.y - startLayer.y, p.x - startLayer.x);
        const deg = ((a1 - a0) * 180) / Math.PI;
        s.updateLayer(startLayer.id, { rotation: startLayer.rotation + deg });
      } else if (mode === "scale" && startLayer) {
        const d0 = Math.hypot(start.x - startLayer.x, start.y - startLayer.y) || 1;
        const d1 = Math.hypot(p.x - startLayer.x, p.y - startLayer.y);
        const k = Math.max(0.05, d1 / d0);
        s.updateLayer(startLayer.id, { scaleX: startLayer.scaleX * k, scaleY: startLayer.scaleY * k });
      } else if (mode === "lasso" || mode === "pen") {
        polyPoints.push(p);
      } else if (mode === "marquee") {
        polyPoints = [p];
      } else if ((mode === "brush" || mode === "eraser") && startLayer) {
        brushStroke.push(p);
      }
      scheduleOverlay();
    };

    const onUp = async () => {
      if (!dragging) return;
      dragging = false;
      const s = useEditor.getState();

      if (mode === "lasso" && polyPoints.length > 2) {
        const inside = s.project.layers
          .filter((l) => l.kind === "image")
          .filter((l) => {
            const sampled = sampleLayer(l, s.currentFrame);
            return pointInPolygon({ x: sampled.x, y: sampled.y }, polyPoints);
          })
          .map((l) => l.id);
        s.select(inside);
      } else if (mode === "marquee" && polyPoints.length) {
        const end = polyPoints[polyPoints.length - 1];
        const x0 = Math.min(start.x, end.x), x1 = Math.max(start.x, end.x);
        const y0 = Math.min(start.y, end.y), y1 = Math.max(start.y, end.y);
        const inside = s.project.layers
          .filter((l) => l.kind === "image")
          .filter((l) => {
            const sampled = sampleLayer(l, s.currentFrame);
            return sampled.x >= x0 && sampled.x <= x1 && sampled.y >= y0 && sampled.y <= y1;
          })
          .map((l) => l.id);
        if (inside.length) s.select(inside);
      } else if ((mode === "brush" || mode === "eraser") && startLayer && startLayer.src && brushStroke.length) {
        const local = brushStroke.map((pt) => contentToLayerLocal(startLayer!, pt));
        try {
          const brushSize = 24;
          const next = await applyBrushStroke(
            startLayer.src,
            mode === "brush" ? "paint" : "erase",
            local,
            brushSize,
          );
          s.pushHistory();
          s.updateLayer(startLayer.id, { src: next });
        } catch { /* ignore */ }
      }

      mode = null;
      polyPoints = [];
      brushStroke = [];
      startLayer = null;
      scheduleOverlay();
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("resize", scheduleOverlay);
    scheduleOverlay();

    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", scheduleOverlay);
      unsub();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [hostRef, overlayRef]);
}
