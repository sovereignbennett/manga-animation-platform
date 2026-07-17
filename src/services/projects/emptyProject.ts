import type { Project } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function createEmptyProject(name = "Untitled Project"): Project {
  return {
    id: uid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    layers: [],
    order: [],
    canvasWidth: 1080,
    canvasHeight: 1920,
  };
}

