import { useEffect, useRef } from "react";
import { Application, Assets, Container, Sprite, Graphics } from "pixi.js";
import { useEditor } from "@/store/editorStore";

/**
 * Infinite PixiJS stage with pan (space+drag or middle-mouse), zoom (wheel),
 * and rendering of all image layers according to store order.
 */
export function CanvasStage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const gridRef = useRef<Graphics | null>(null);
  const spritesRef = useRef<Map<string, Sprite>>(new Map());
  const initedRef = useRef(false);

  // init pixi
  useEffect(() => {
    if (initedRef.current || !hostRef.current) return;
    initedRef.current = true;

    const app = new Application();
    let disposed = false;

    (async () => {
      await app.init({
        background: 0x121218,
        antialias: true,
        resizeTo: hostRef.current!,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      hostRef.current!.appendChild(app.canvas);
      app.canvas.style.display = "block";

      appRef.current = app;
      const world = new Container();
      world.label = "world";
      // center world at midpoint
      world.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.addChild(world);
      worldRef.current = world;

      const grid = new Graphics();
      world.addChild(grid);
      gridRef.current = grid;

      drawGrid();
      renderLayers();

      // resize handler keeps world centered
      const onResize = () => {
        drawGrid();
      };
      window.addEventListener("resize", onResize);
      app.canvas.dataset.resizeCleanup = "1";
      (app as unknown as { _cleanup?: () => void })._cleanup = () =>
        window.removeEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      const app = appRef.current;
      if (app) {
        (app as unknown as { _cleanup?: () => void })._cleanup?.();
        app.destroy(true, { children: true, texture: false });
      }
      appRef.current = null;
      worldRef.current = null;
      spritesRef.current.clear();
      initedRef.current = false;
    };
  }, []);

  // Subscribe to store: re-render on project changes
  useEffect(() => {
    const unsub = useEditor.subscribe(
      (s) => ({ p: s.project, sel: s.selectedIds, zoom: s.zoom, pan: s.pan }),
      () => renderLayers(),
    );
    return unsub;
  }, []);

  const drawGrid = () => {
    const g = gridRef.current;
    const app = appRef.current;
    if (!g || !app) return;
    g.clear();
    const size = 4000;
    const step = 100;
    g.setStrokeStyle({ width: 1, color: 0x2a2a34, alpha: 0.6 });
    for (let x = -size; x <= size; x += step) {
      g.moveTo(x, -size).lineTo(x, size);
    }
    for (let y = -size; y <= size; y += step) {
      g.moveTo(-size, y).lineTo(size, y);
    }
    g.stroke();
    // Origin cross
    g.setStrokeStyle({ width: 2, color: 0xd44dc9, alpha: 0.7 });
    g.moveTo(-20, 0).lineTo(20, 0);
    g.moveTo(0, -20).lineTo(0, 20);
    g.stroke();
  };

  const renderLayers = async () => {
    const world = worldRef.current;
    if (!world) return;
    const { project, zoom, pan } = useEditor.getState();

    world.scale.set(zoom);
    const app = appRef.current!;
    world.position.set(app.screen.width / 2 + pan.x, app.screen.height / 2 + pan.y);

    // Remove stale sprites
    const currentIds = new Set(project.order);
    for (const [id, sp] of spritesRef.current.entries()) {
      if (!currentIds.has(id)) {
        world.removeChild(sp);
        sp.destroy();
        spritesRef.current.delete(id);
      }
    }

    // Add / update sprites in painting order
    for (const id of project.order) {
      const layer = project.layers.find((l) => l.id === id);
      if (!layer || layer.kind !== "image" || !layer.src) continue;

      let sp = spritesRef.current.get(id);
      if (!sp) {
        try {
          const tex = await Assets.load(layer.src);
          sp = new Sprite(tex);
          spritesRef.current.set(id, sp);
          world.addChild(sp);
        } catch {
          continue;
        }
      } else {
        // ensure it's above grid and in correct z order
        world.setChildIndex(sp, world.children.length - 1);
      }

      sp.anchor.set(layer.anchorX, layer.anchorY);
      sp.position.set(layer.x, layer.y);
      sp.rotation = (layer.rotation * Math.PI) / 180;
      sp.scale.set(layer.scaleX, layer.scaleY);
      sp.alpha = layer.opacity;
      sp.visible = layer.visible;
    }
  };

  // Pan + zoom
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let isPanning = false;
    let spaceDown = false;
    let last = { x: 0, y: 0 };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDown = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDown = false;
    };

    const onDown = (e: MouseEvent) => {
      if (e.button === 1 || spaceDown) {
        isPanning = true;
        last = { x: e.clientX, y: e.clientY };
        el.style.cursor = "grabbing";
        e.preventDefault();
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const s = useEditor.getState();
      s.setPan({ x: s.pan.x + dx, y: s.pan.y + dy });
    };
    const onUp = () => {
      isPanning = false;
      el.style.cursor = "";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = useEditor.getState();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      s.setZoom(s.zoom * factor);
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="relative flex-1 min-w-0 min-h-0 checker-bg">
      <div ref={hostRef} className="absolute inset-0" />
      <CanvasHud />
    </div>
  );
}

function CanvasHud() {
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const tool = useEditor((s) => s.activeTool);
  const setPan = useEditor((s) => s.setPan);

  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface/70 backdrop-blur border border-border text-[11px] text-muted-foreground">
        <span className="text-foreground/80 capitalize">{tool}</span>
        <span className="mx-2 text-border-strong">·</span>
        <span>
          Hold <kbd className="px-1 rounded bg-surface-2 text-[10px]">Space</kbd> to pan · scroll to
          zoom
        </span>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-surface/80 backdrop-blur border border-border px-1 py-1">
        <button className="tool-btn !w-7 !h-7" onClick={() => setZoom(zoom / 1.2)}>
          −
        </button>
        <div className="text-[11px] font-mono w-14 text-center">{Math.round(zoom * 100)}%</div>
        <button className="tool-btn !w-7 !h-7" onClick={() => setZoom(zoom * 1.2)}>
          +
        </button>
        <button
          className="tool-btn !w-7 !h-7 text-[10px]"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Fit
        </button>
      </div>
    </>
  );
}
