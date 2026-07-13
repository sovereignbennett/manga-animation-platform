import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import type { Project } from "@/store/editorStore";

export interface PixiRenderContext {
  app: Application;
  world: Container;
  grid: Graphics;
  sprites: Map<string, Sprite>;
}

export function drawEditorGrid(grid: Graphics) {
  grid.clear();

  const size = 4000;
  const step = 100;

  grid.setStrokeStyle({ width: 1, color: 0x2a2a34, alpha: 0.6 });
  for (let x = -size; x <= size; x += step) {
    grid.moveTo(x, -size).lineTo(x, size);
  }
  for (let y = -size; y <= size; y += step) {
    grid.moveTo(-size, y).lineTo(size, y);
  }
  grid.stroke();

  grid.setStrokeStyle({ width: 2, color: 0xd44dc9, alpha: 0.7 });
  grid.moveTo(-20, 0).lineTo(20, 0);
  grid.moveTo(0, -20).lineTo(0, 20);
  grid.stroke();
}

export async function syncPixiLayers(
  context: PixiRenderContext,
  project: Project,
  viewport: { zoom: number; pan: { x: number; y: number } },
) {
  const { app, world, sprites } = context;

  world.scale.set(viewport.zoom);
  world.position.set(app.screen.width / 2 + viewport.pan.x, app.screen.height / 2 + viewport.pan.y);

  const currentIds = new Set(project.order);
  for (const [id, sprite] of sprites.entries()) {
    if (!currentIds.has(id)) {
      world.removeChild(sprite);
      sprite.destroy();
      sprites.delete(id);
    }
  }

  for (const id of project.order) {
    const layer = project.layers.find((item) => item.id === id);
    if (!layer || layer.kind !== "image" || !layer.src) continue;

    let sprite = sprites.get(id);
    if (!sprite) {
      try {
        const texture = await Assets.load(layer.src);
        sprite = new Sprite(texture);
        sprites.set(id, sprite);
        world.addChild(sprite);
      } catch {
        continue;
      }
    } else {
      world.setChildIndex(sprite, world.children.length - 1);
    }

    sprite.anchor.set(layer.anchorX, layer.anchorY);
    sprite.position.set(layer.x, layer.y);
    sprite.rotation = (layer.rotation * Math.PI) / 180;
    sprite.scale.set(layer.scaleX, layer.scaleY);
    sprite.alpha = layer.opacity;
    sprite.visible = layer.visible;
  }
}
