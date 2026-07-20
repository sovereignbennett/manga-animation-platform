/**
 * PixiApp — bootstraps a Pixi.js v8 Application on a canvas element.
 * This is an adapter: services stay Pixi-free.
 */
import { Application, Container } from "pixi.js";

export interface PixiHandle {
  app: Application;
  stage: Container;   // root user-content container (transforms live here)
  destroy: () => void;
}

export async function createPixiApp(canvas: HTMLCanvasElement, opts?: {
  width?: number; height?: number; backgroundAlpha?: number;
}): Promise<PixiHandle> {
  const app = new Application();
  await app.init({
    canvas,
    width: opts?.width ?? (canvas.clientWidth || 960),
    height: opts?.height ?? (canvas.clientHeight || 540),
    backgroundAlpha: opts?.backgroundAlpha ?? 0,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  const stage = new Container();
  stage.label = "user-stage";
  app.stage.addChild(stage);
  return {
    app,
    stage,
    destroy: () => {
      app.destroy(true, { children: true, texture: true });
    },
  };
}
