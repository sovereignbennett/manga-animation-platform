import { useEffect, useRef } from "react";
import {
  Application,
  Assets,
  Container,
  Sprite,
  Graphics,
  Texture,
  Rectangle,
} from "pixi.js";
import { GlowFilter, RGBSplitFilter } from "pixi-filters";
import { BlurFilter, ColorMatrixFilter } from "pixi.js";
import { useEditor, sampleLayer, type Layer } from "@/store/editorStore";
import { registerFrameRenderer } from "@/services/export/exportBridge";
import { useCanvasTools } from "@/hooks/useCanvasTools";

interface SpriteEntry {
  sprite: Sprite;
  src: string;
  video?: HTMLVideoElement;
  glow?: GlowFilter;
  blur?: BlurFilter;
  chromatic?: RGBSplitFilter;
  flash?: ColorMatrixFilter;
}

/**
 * Infinite PixiJS stage with pan (space+drag or middle-mouse), zoom (wheel),
 * rendering of all image/video layers, per-layer effects, and an offscreen
 * frame renderer used by the export pipeline.
 */
export function CanvasStage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const contentRef = useRef<Container | null>(null); // layers live here; world = grid + content
  useCanvasTools(hostRef, overlayRef);
  const gridRef = useRef<Graphics | null>(null);
  const frameGuideRef = useRef<Graphics | null>(null);
  const spritesRef = useRef<Map<string, SpriteEntry>>(new Map());
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
        backgroundAlpha: 1,
        preserveDrawingBuffer: true,
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
      world.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.addChild(world);
      worldRef.current = world;

      const grid = new Graphics();
      world.addChild(grid);
      gridRef.current = grid;

      const guide = new Graphics();
      world.addChild(guide);
      frameGuideRef.current = guide;

      const content = new Container();
      content.label = "content";
      world.addChild(content);
      contentRef.current = content;

      drawGrid();
      drawFrameGuide();
      renderLayers();

      const onResize = () => {
        drawGrid();
      };
      window.addEventListener("resize", onResize);
      (app as unknown as { _cleanup?: () => void })._cleanup = () =>
        window.removeEventListener("resize", onResize);

      // Register frame renderer for export pipeline
      const unregister = registerFrameRenderer(async (frame, opts) => {
        return await renderOffscreen(frame, opts);
      });
      (app as unknown as { _unregister?: () => void })._unregister = unregister;
    })();

    return () => {
      disposed = true;
      const app = appRef.current;
      if (app) {
        (app as unknown as { _cleanup?: () => void })._cleanup?.();
        (app as unknown as { _unregister?: () => void })._unregister?.();
        app.destroy(true, { children: true, texture: false });
      }
      // Cleanup videos
      for (const e of spritesRef.current.values()) {
        if (e.video) {
          e.video.pause();
          e.video.src = "";
        }
      }
      appRef.current = null;
      worldRef.current = null;
      contentRef.current = null;
      spritesRef.current.clear();
      initedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsub = useEditor.subscribe(
      (s) => ({
        p: s.project,
        sel: s.selectedIds,
        zoom: s.zoom,
        pan: s.pan,
        f: s.currentFrame,
      }),
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
    for (let x = -size; x <= size; x += step)
      g.moveTo(x, -size).lineTo(x, size);
    for (let y = -size; y <= size; y += step)
      g.moveTo(-size, y).lineTo(size, y);
    g.stroke();
    g.setStrokeStyle({ width: 2, color: 0xd44dc9, alpha: 0.7 });
    g.moveTo(-20, 0).lineTo(20, 0);
    g.moveTo(0, -20).lineTo(0, 20);
    g.stroke();
  };

  const drawFrameGuide = () => {
    const g = frameGuideRef.current;
    if (!g) return;
    const { project } = useEditor.getState();
    const w = project.canvasWidth;
    const h = project.canvasHeight;
    g.clear();
    g.setStrokeStyle({ width: 2, color: 0x4dd4d4, alpha: 0.6 });
    g.rect(-w / 2, -h / 2, w, h).stroke();
  };

  const pendingRef = useRef<Map<string, Promise<SpriteEntry | null>>>(
    new Map(),
  );

  const ensureSpriteForLayer = async (
    rawLayer: Layer,
  ): Promise<SpriteEntry | null> => {
    const existing = spritesRef.current.get(rawLayer.id);
    if (!rawLayer.src) return null;

    if (
      existing &&
      existing.src !== rawLayer.src &&
      rawLayer.mediaType !== "video"
    ) {
      try {
        const tex = await Assets.load(rawLayer.src);
        existing.sprite.texture = tex;
        existing.src = rawLayer.src;
      } catch {
        /* ignore */
      }
    }
    if (existing) return existing;

    const inFlight = pendingRef.current.get(rawLayer.id);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<SpriteEntry | null> => {
      try {
        let entry: SpriteEntry;
        if (rawLayer.mediaType === "video") {
          const video = document.createElement("video");
          video.src = rawLayer.src!;
          video.crossOrigin = "anonymous";
          video.muted = true;
          video.playsInline = true;
          video.loop = false;
          await new Promise<void>((res, rej) => {
            video.onloadeddata = () => res();
            video.onerror = () => rej(new Error("video load failed"));
          });
          const tex = Texture.from(video);
          const sp = new Sprite(tex);
          entry = { sprite: sp, src: rawLayer.src!, video };
        } else {
          const tex = await Assets.load(rawLayer.src!);
          const sp = new Sprite(tex);
          entry = { sprite: sp, src: rawLayer.src! };
        }
        spritesRef.current.set(rawLayer.id, entry);
        contentRef.current?.addChild(entry.sprite);
        return entry;
      } catch {
        return null;
      } finally {
        pendingRef.current.delete(rawLayer.id);
      }
    })();

    pendingRef.current.set(rawLayer.id, promise);
    return promise;
  };

  const applyEffects = (
    entry: SpriteEntry,
    layer: Layer,
    currentFrame: number,
  ) => {
    const filters: (
      | BlurFilter
      | GlowFilter
      | RGBSplitFilter
      | ColorMatrixFilter
    )[] = [];
    let shakeDx = 0,
      shakeDy = 0,
      shakeRot = 0;
    let impactScale = 1;
    let flashAmount = 0;

    for (const eff of layer.effects ?? []) {
      if (!eff.enabled) continue;
      switch (eff.kind) {
        case "glow": {
          if (!entry.glow)
            entry.glow = new GlowFilter({
              distance: 15,
              outerStrength: 4,
              innerStrength: 0,
              color: 0xffffff,
              quality: 0.3,
            });
          entry.glow.outerStrength = eff.strength;
          entry.glow.innerStrength = eff.innerStrength;
          entry.glow.color =
            parseInt(eff.color.replace("#", ""), 16) || 0xffffff;
          filters.push(entry.glow);
          break;
        }
        case "motionBlur": {
          if (!entry.blur)
            entry.blur = new BlurFilter({ strength: eff.amount, quality: 2 });
          entry.blur.strength = eff.amount;
          filters.push(entry.blur);
          break;
        }
        case "chromatic": {
          if (!entry.chromatic) entry.chromatic = new RGBSplitFilter();
          const rad = (eff.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * eff.offset;
          const dy = Math.sin(rad) * eff.offset;
          entry.chromatic.red = { x: -dx, y: -dy };
          entry.chromatic.green = { x: 0, y: 0 };
          entry.chromatic.blue = { x: dx, y: dy };
          filters.push(entry.chromatic);
          break;
        }
        case "shake": {
          const t = currentFrame / 30;
          const seed = layer.id.charCodeAt(0) || 1;
          shakeDx += Math.sin(t * eff.frequency + seed) * eff.amplitude;
          shakeDy += Math.cos(t * eff.frequency * 1.3 + seed) * eff.amplitude;
          shakeRot += Math.sin(t * eff.frequency * 0.7 + seed) * eff.rotational;
          break;
        }
        case "impact": {
          const dt = currentFrame - eff.frame;
          if (dt >= 0 && dt < eff.duration) {
            const p = 1 - dt / eff.duration;
            impactScale += eff.scale * p;
            flashAmount = Math.max(flashAmount, eff.flash * p);
          }
          break;
        }
      }
    }

    if (flashAmount > 0) {
      if (!entry.flash) entry.flash = new ColorMatrixFilter();
      entry.flash.reset();
      entry.flash.brightness(1 + flashAmount * 2, false);
      filters.push(entry.flash);
    }

    entry.sprite.filters = filters.length ? filters : null;
    return { shakeDx, shakeDy, shakeRot, impactScale };
  };

  const renderLayers = async () => {
    const world = worldRef.current;
    const content = contentRef.current;
    if (!world || !content) return;
    const { project, zoom, pan, currentFrame, fps } = useEditor.getState();

    world.scale.set(zoom);
    const app = appRef.current!;
    world.position.set(
      app.screen.width / 2 + pan.x,
      app.screen.height / 2 + pan.y,
    );
    drawFrameGuide();

    // Remove stale sprites
    const currentIds = new Set(project.order);
    for (const [id, entry] of spritesRef.current.entries()) {
      if (!currentIds.has(id)) {
        content.removeChild(entry.sprite);
        entry.sprite.destroy();
        if (entry.video) {
          entry.video.pause();
          entry.video.src = "";
        }
        spritesRef.current.delete(id);
      }
    }

    // Add / update sprites in painting order
    for (const id of project.order) {
      const rawLayer = project.layers.find((l) => l.id === id);
      if (!rawLayer || rawLayer.kind !== "image" || !rawLayer.src) continue;
      const layer = sampleLayer(rawLayer, currentFrame);

      const entry = await ensureSpriteForLayer(rawLayer);
      if (!entry) continue;
      content.setChildIndex(entry.sprite, content.children.length - 1);

      // Sync video time to timeline playhead
      if (entry.video && rawLayer.videoDurationSec) {
        const t = Math.min(
          rawLayer.videoDurationSec - 0.01,
          Math.max(0, currentFrame / fps),
        );
        if (Math.abs(entry.video.currentTime - t) > 0.05) {
          try {
            entry.video.currentTime = t;
          } catch {
            /* ignore */
          }
        }
      }

      const fx = applyEffects(entry, rawLayer, currentFrame);

      const sp = entry.sprite;
      sp.anchor.set(layer.anchorX, layer.anchorY);
      sp.position.set(layer.x + fx.shakeDx, layer.y + fx.shakeDy);
      sp.rotation = ((layer.rotation + fx.shakeRot) * Math.PI) / 180;
      sp.scale.set(
        layer.scaleX * fx.impactScale,
        layer.scaleY * fx.impactScale,
      );
      sp.alpha = layer.opacity;
      sp.visible = layer.visible;
    }
  };

  /** Renders a single frame to an HTMLCanvasElement — used by the export pipeline. */
  const renderOffscreen = async (
    frame: number,
    opts?: { transparent?: boolean; width?: number; height?: number },
  ): Promise<HTMLCanvasElement> => {
    const app = appRef.current;
    const content = contentRef.current;
    if (!app || !content) throw new Error("not ready");
    const { project, fps } = useEditor.getState();
    const outW = opts?.width ?? project.canvasWidth;
    const outH = opts?.height ?? project.canvasHeight;

    // Temporarily reparent content onto a clean container centered at the frame origin
    const parent = content.parent!;
    const idx = parent.getChildIndex(content);
    const stage = new Container();
    stage.addChild(content);

    // Update sprites to the requested frame without touching UI state
    for (const id of project.order) {
      const rawLayer = project.layers.find((l) => l.id === id);
      if (!rawLayer || rawLayer.kind !== "image" || !rawLayer.src) continue;
      const layer = sampleLayer(rawLayer, frame);
      const entry = await ensureSpriteForLayer(rawLayer);
      if (!entry) continue;
      if (entry.video && rawLayer.videoDurationSec) {
        const t = Math.min(
          rawLayer.videoDurationSec - 0.01,
          Math.max(0, frame / fps),
        );
        try {
          entry.video.currentTime = t;
          await new Promise<void>((res) => {
            const onSeek = () => {
              entry.video!.removeEventListener("seeked", onSeek);
              res();
            };
            entry.video!.addEventListener("seeked", onSeek);
            setTimeout(() => res(), 200);
          });
        } catch {
          /* ignore */
        }
      }
      const fx = applyEffects(entry, rawLayer, frame);
      const sp = entry.sprite;
      sp.anchor.set(layer.anchorX, layer.anchorY);
      sp.position.set(
        layer.x + fx.shakeDx + outW / 2,
        layer.y + fx.shakeDy + outH / 2,
      );
      sp.rotation = ((layer.rotation + fx.shakeRot) * Math.PI) / 180;
      sp.scale.set(
        layer.scaleX * fx.impactScale,
        layer.scaleY * fx.impactScale,
      );
      sp.alpha = layer.opacity;
      sp.visible = layer.visible;
    }

    const frameRect = new Rectangle(0, 0, outW, outH);
    const canvas = app.renderer.extract.canvas({
      target: stage,
      frame: frameRect,
      clearColor: opts?.transparent ? 0x00000000 : 0x121218,
      antialias: true,
    }) as HTMLCanvasElement;

    // Return content to normal parent so on-screen rendering continues to work
    parent.addChildAt(content, idx);
    stage.destroy({ children: false });

    // Trigger a normal re-render to restore on-screen positions
    void renderLayers();
    return canvas;
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

    const onDown = (e: PointerEvent) => {
      if ((e.pointerType === "mouse" && e.button === 1) || spaceDown) {
        isPanning = true;
        last = { x: e.clientX, y: e.clientY };
        el.style.cursor = "grabbing";
        el.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!isPanning) return;
      e.preventDefault();
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const s = useEditor.getState();
      s.setPan({ x: s.pan.x + dx, y: s.pan.y + dy });
    };
    const onUp = (e?: PointerEvent) => {
      if (e) el.releasePointerCapture?.(e.pointerId);
      isPanning = false;
      el.style.cursor = "";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = useEditor.getState();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      s.setZoom(s.zoom * factor);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="relative flex-1 min-w-0 min-h-0 checker-bg">
      <div ref={hostRef} className="absolute inset-0 touch-none" />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0"
      />
      <CanvasHud />
    </div>
  );
}

function CanvasHud() {
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const tool = useEditor((s) => s.activeTool);
  const setPan = useEditor((s) => s.setPan);
  const cw = useEditor((s) => s.project.canvasWidth);
  const ch = useEditor((s) => s.project.canvasHeight);

  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface/70 backdrop-blur border border-border text-[11px] text-muted-foreground">
        <span className="text-foreground/80 capitalize">{tool}</span>
        <span className="mx-2 text-border-strong">·</span>
        <span className="font-mono">
          {cw}×{ch}
        </span>
        <span className="mx-2 text-border-strong">·</span>
        <span>
          Hold{" "}
          <kbd className="px-1 rounded bg-surface-2 text-[10px]">Space</kbd> to
          pan · scroll to zoom
        </span>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-surface/80 backdrop-blur border border-border px-1 py-1">
        <button
          className="tool-btn !w-7 !h-7"
          onClick={() => setZoom(zoom / 1.2)}
        >
          −
        </button>
        <div className="text-[11px] font-mono w-14 text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button
          className="tool-btn !w-7 !h-7"
          onClick={() => setZoom(zoom * 1.2)}
        >
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
