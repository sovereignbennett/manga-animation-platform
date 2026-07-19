import { useEffect } from "react";
import { useEditor, type Layer, sampleLayer } from "@/store/editorStore";
import { applyBrushStroke, cutToPolygon } from "@/services/masking/maskOps";
import { useToolSettings } from "@/store/toolSettings";
import { createTextLayer } from "@/services/text/textLayer";

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

function topSelectedLayerAt(p: Pt): Layer | null {
  const s = useEditor.getState();
  const order = s.project.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const l = s.project.layers.find((x) => x.id === order[i]);
    if (!l || !s.selectedIds.includes(l.id)) continue;
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
    let hover: Pt | null = null;
    let insideHost = false;

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
        ctx.fillStyle = "#4dd4d4";
        ctx.beginPath();
        ctx.arc(0, 0, 4 / s.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // active lasso path
      if (mode === "lasso" && polyPoints.length > 1) {
        ctx.beginPath();
        polyPoints.forEach((p, i) => {
          const sx = cx + p.x * s.zoom;
          const sy = cy + p.y * s.zoom;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.strokeStyle = "#d44dc9";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // pen path: anchors + connecting segments + rubber-band to cursor
      if (s.activeTool === "pen" && (polyPoints.length > 0 || mode === "pen")) {
        const pts = polyPoints;
        if (pts.length > 1) {
          ctx.beginPath();
          pts.forEach((p, i) => {
            const sx = cx + p.x * s.zoom;
            const sy = cy + p.y * s.zoom;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.strokeStyle = "#4dd4d4";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // Rubber band from last point to hover
        if (pts.length > 0 && hover && insideHost) {
          const last = pts[pts.length - 1];
          ctx.beginPath();
          ctx.moveTo(cx + last.x * s.zoom, cy + last.y * s.zoom);
          ctx.lineTo(cx + hover.x * s.zoom, cy + hover.y * s.zoom);
          ctx.strokeStyle = "rgba(77,212,212,0.6)";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Anchors
        pts.forEach((p, i) => {
          const sx = cx + p.x * s.zoom;
          const sy = cy + p.y * s.zoom;
          ctx.fillStyle = i === 0 ? "#d44dc9" : "#0f0f14";
          ctx.strokeStyle = "#4dd4d4";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(sx - 3.5, sy - 3.5, 7, 7);
          ctx.fill();
          ctx.stroke();
        });
        // Next-point ghost
        if (hover && insideHost) {
          const sx = cx + hover.x * s.zoom;
          const sy = cy + hover.y * s.zoom;
          ctx.strokeStyle = "rgba(77,212,212,0.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
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

      // Brush / Eraser live cursor preview
      if ((s.activeTool === "brush" || s.activeTool === "eraser") && hover && insideHost) {
        const ts = useToolSettings.getState();
        const tool = s.activeTool === "brush" ? ts.brush : ts.eraser;
        // Estimate on-screen radius using the target layer scale (if any)
        const targetRaw =
          s.project.layers.find((l) => s.selectedIds.includes(l.id) && l.kind === "image") ??
          topLayerAt(hover);
        const scale = targetRaw ? sampleLayer(targetRaw, s.currentFrame).scaleX : 1;
        const rPx = tool.size * Math.abs(scale || 1) * s.zoom;
        const sx = cx + hover.x * s.zoom;
        const sy = cy + hover.y * s.zoom;
        ctx.save();
        if (s.activeTool === "brush") {
          const color = "color" in tool ? (tool.color as string) : "#ffffff";
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.18 * (tool.opacity ?? 1);
          ctx.beginPath();
          ctx.arc(sx, sy, rPx, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = color;
        } else {
          ctx.strokeStyle = "#ffffff";
        }
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(2, rPx), 0, Math.PI * 2);
        ctx.stroke();
        // crosshair
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
        ctx.stroke();
        ctx.restore();
      }

      // Text tool insertion cursor
      if (s.activeTool === "text" && hover && insideHost) {
        const sx = cx + hover.x * s.zoom;
        const sy = cy + hover.y * s.zoom;
        ctx.strokeStyle = "#4dd4d4";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
        ctx.moveTo(sx - 4, sy - 10); ctx.lineTo(sx + 4, sy - 10);
        ctx.moveTo(sx - 4, sy + 10); ctx.lineTo(sx + 4, sy + 10);
        ctx.stroke();
      }
    };

    let rafId = 0;
    const scheduleOverlay = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; drawOverlay(); });
    };

    const unsub = useEditor.subscribe(
      (s) => ({ z: s.zoom, p: s.pan, sel: s.selectedIds, ord: s.project.order, f: s.currentFrame, layers: s.project.layers, tool: s.activeTool }),
      scheduleOverlay,
    );
    const unsubTools = useToolSettings.subscribe(
      (s) => ({ b: s.brush, e: s.eraser }),
      scheduleOverlay,
    );

    const commitPenPath = () => {
      const s = useEditor.getState();
      if (polyPoints.length < 3) return;
      const selImage = s.project.layers.find(
        (l) => s.selectedIds.includes(l.id) && l.kind === "image" && l.src && l.mediaType !== "video",
      );
      if (selImage) {
        const sampled = { ...sampleLayer(selImage, s.currentFrame), src: selImage.src! };
        const local = polyPoints.map((pt) => contentToLayerLocal(sampled, pt));
        cutToPolygon(selImage.src!, local)
          .then((next) => {
            s.pushHistory();
            s.updateLayer(selImage.id, { src: next });
          })
          .catch(() => { /* ignore */ });
      } else {
        const inside = s.project.layers
          .filter((l) => l.kind === "image")
          .filter((l) => {
            const sampled = sampleLayer(l, s.currentFrame);
            return pointInPolygon({ x: sampled.x, y: sampled.y }, polyPoints);
          })
          .map((l) => l.id);
        s.select(inside);
      }
      polyPoints = [];
      scheduleOverlay();
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target !== el && !el.contains(target)) return;
      if (el.style.cursor === "grabbing") return;

      const s = useEditor.getState();
      const tool = s.activeTool;
      const p = screenToContent(el, e);
      start = p;

      if (tool === "camera") return;

      if (tool === "text") {
        const ts = useToolSettings.getState();
        createTextLayer(p.x, p.y, ts.text);
        // switch to select so the user can immediately manipulate it
        s.setTool("select");
        return;
      }

      if (tool === "select") {
        const hit = topLayerAt(p);
        if (hit) {
          const nextSel = e.shiftKey ? Array.from(new Set([...s.selectedIds, hit.id])) : [hit.id];
          s.select(nextSel);
        } else {
          if (!e.shiftKey) s.select([]);
          mode = "marquee";
          polyPoints = [p];
          dragging = true;
          e.preventDefault();
          return;
        }
        return;
      }

      if (tool === "magic") {
        const hit = topLayerAt(p);
        if (hit) { s.select([hit.id]); s.setSidebarPanel("magic"); }
        return;
      }

      if (tool === "lasso") {
        mode = "lasso";
        polyPoints = [p];
        dragging = true;
        e.preventDefault();
        return;
      }

      if (tool === "pen") {
        // Pen is click-to-add-anchor (not drag). Add a point per click.
        // Double-click to commit (handled via dblclick listener below).
        polyPoints.push(p);
        scheduleOverlay();
        e.preventDefault();
        return;
      }

      if (tool === "brush" || tool === "eraser") {
        const rawStrokeTarget = topSelectedLayerAt(p) ?? topLayerAt(p);
        if (!rawStrokeTarget?.src || rawStrokeTarget.mediaType === "video") return;
        startLayer = { ...sampleLayer(rawStrokeTarget, s.currentFrame), src: rawStrokeTarget.src };
        s.select([rawStrokeTarget.id]);
        mode = tool;
        brushStroke = [p];
        dragging = true;
        e.preventDefault();
        scheduleOverlay();
        return;
      }

      // Transform tools require a selected layer
      let target2 = s.project.layers.find((l) => s.selectedIds.includes(l.id) && l.kind === "image") ?? null;
      if (!target2) {
        const hit = topLayerAt(p);
        if (hit) { s.select([hit.id]); target2 = hit; }
      }
      if (!target2) return;
      startLayer = { ...target2 };

      if (tool === "move") { mode = "move"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
      if (tool === "rotate") { mode = "rotate"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
      if (tool === "scale") { mode = "scale"; dragging = true; s.pushHistory(); e.preventDefault(); return; }
    };

    const onMove = (e: MouseEvent) => {
      const p = screenToContent(el, e);
      // Track hover for cursor previews (brush/eraser/pen/text)
      const rect = el.getBoundingClientRect();
      insideHost =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      hover = p;

      if (!dragging) { scheduleOverlay(); return; }
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
      } else if (mode === "lasso") {
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
        const selImage = s.project.layers.find(
          (l) => s.selectedIds.includes(l.id) && l.kind === "image" && l.src && l.mediaType !== "video",
        );
        if (selImage) {
          const sampled = { ...sampleLayer(selImage, s.currentFrame), src: selImage.src! };
          const local = polyPoints.map((pt) => contentToLayerLocal(sampled, pt));
          try {
            const next = await cutToPolygon(selImage.src!, local);
            s.pushHistory();
            s.updateLayer(selImage.id, { src: next });
          } catch { /* ignore */ }
        } else {
          const inside = s.project.layers
            .filter((l) => l.kind === "image")
            .filter((l) => {
              const sampled = sampleLayer(l, s.currentFrame);
              return pointInPolygon({ x: sampled.x, y: sampled.y }, polyPoints);
            })
            .map((l) => l.id);
          s.select(inside);
        }
        polyPoints = [];
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
        polyPoints = [];
      } else if ((mode === "brush" || mode === "eraser") && startLayer && startLayer.src && brushStroke.length) {
        const local = brushStroke.map((pt) => contentToLayerLocal(startLayer!, pt));
        try {
          const ts = useToolSettings.getState();
          const settings = mode === "brush" ? ts.brush : ts.eraser;
          const next = await applyBrushStroke(
            startLayer.src,
            mode === "brush" ? "paint" : "erase",
            local,
            settings.size,
            {
              color: mode === "brush" ? ts.brush.color : undefined,
              opacity: settings.opacity,
            },
          );
          s.pushHistory();
          s.updateLayer(startLayer.id, { src: next });
          if (mode === "brush") ts.pushRecentColor(ts.brush.color);
        } catch { /* ignore */ }
        brushStroke = [];
      }

      mode = null;
      startLayer = null;
      scheduleOverlay();
    };

    const onDblClick = (e: MouseEvent) => {
      const s = useEditor.getState();
      if (s.activeTool === "pen" && polyPoints.length >= 3) {
        e.preventDefault();
        commitPenPath();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      if (s.activeTool === "pen") {
        if (e.key === "Enter") { e.preventDefault(); commitPenPath(); }
        else if (e.key === "Escape") { polyPoints = []; scheduleOverlay(); }
      }
    };

    const onLeave = () => { insideHost = false; scheduleOverlay(); };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", scheduleOverlay);
    scheduleOverlay();

    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", scheduleOverlay);
      unsub();
      unsubTools();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [hostRef, overlayRef]);
}
