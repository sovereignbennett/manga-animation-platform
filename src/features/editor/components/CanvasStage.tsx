import { useEffect, useRef } from "react";
import { Application, Container, Sprite, Graphics } from "pixi.js";
import { useEditor } from "@/store/editorStore";
import { useCanvasViewportControls } from "@/features/editor/hooks/useCanvasViewportControls";
import {
  drawEditorGrid,
  syncPixiLayers,
  type PixiRenderContext,
} from "@/features/editor/rendering/pixiRenderer";

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
  useCanvasViewportControls(hostRef);

  // init pixi
  useEffect(() => {
    if (initedRef.current || !hostRef.current) return;
    initedRef.current = true;
    const sprites = spritesRef.current;

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
      void renderLayers();

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
      sprites.clear();
      initedRef.current = false;
    };
  }, []);

  // Subscribe to store: re-render on project changes
  useEffect(() => {
    const unsub = useEditor.subscribe(
      (s) => ({ p: s.project, sel: s.selectedIds, zoom: s.zoom, pan: s.pan }),
      () => void renderLayers(),
    );
    return unsub;
  }, []);

  const drawGrid = () => {
    const g = gridRef.current;
    if (!g) return;
    drawEditorGrid(g);
  };

  const renderLayers = async () => {
    const world = worldRef.current;
    const app = appRef.current;
    const grid = gridRef.current;
    if (!world || !app || !grid) return;
    const { project, zoom, pan } = useEditor.getState();
    const context: PixiRenderContext = { app, world, grid, sprites: spritesRef.current };
    await syncPixiLayers(context, project, { zoom, pan });
  };

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
