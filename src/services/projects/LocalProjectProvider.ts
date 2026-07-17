import type { ProjectProvider, ProjectSummary, ProjectVersion } from "@/services/providers";
import { createEmptyProject } from "./emptyProject";
import type { Project } from "./types";

const STORAGE_KEY = "motioncut:project:v1";

export class LocalProjectProvider implements ProjectProvider {
  loadInitialProject(): Project | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const project = JSON.parse(raw) as Project;
      return {
        ...createEmptyProject(),
        ...project,
        canvasWidth: project.canvasWidth ?? 1080,
        canvasHeight: project.canvasHeight ?? 1920,
      };
    } catch {
      return null;
    }
  }

  saveProject(project: Project): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Preserve the previous local autosave behavior: storage failures are ignored.
    }
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const project = this.loadInitialProject();
    return project && project.layers.length > 0 ? [toSummary(project)] : [];
  }

  async createProject(project: Project): Promise<{ project: Project; version?: number }> {
    this.saveProject(project);
    return { project, version: 1 };
  }

  async getProject(projectId: string): Promise<{ project: Project; version?: number }> {
    const project = this.loadInitialProject();
    if (!project || project.id !== projectId) throw new Error("Project not found");
    return { project, version: 1 };
  }

  async updateProject(project: Project): Promise<{ project: Project; version?: number }> {
    this.saveProject(project);
    return { project, version: 1 };
  }

  async patchProject(projectId: string, patch: Partial<Pick<Project, "name" | "canvasWidth" | "canvasHeight">>): Promise<{ project: ProjectSummary; version?: number }> {
    const current = this.loadInitialProject();
    if (!current || current.id !== projectId) throw new Error("Project not found");
    const next = { ...current, ...patch, updatedAt: Date.now() };
    this.saveProject(next);
    return { project: toSummary(next), version: 1 };
  }

  async deleteProject(projectId: string): Promise<void> {
    const current = this.loadInitialProject();
    if (typeof window !== "undefined" && current?.id === projectId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async createVersion(projectId: string, _project: Project, label?: string): Promise<ProjectVersion> {
    return {
      id: `local_${Date.now().toString(36)}`,
      projectId,
      number: 1,
      label: label ?? null,
      createdAt: Date.now(),
    };
  }

  async listVersions(_projectId: string): Promise<ProjectVersion[]> {
    return [];
  }

  async getVersion(projectId: string, versionId: string): Promise<{ project: Project; version: ProjectVersion }> {
    const { project } = await this.getProject(projectId);
    return {
      project,
      version: {
        id: versionId,
        projectId,
        number: 1,
        label: null,
        createdAt: project.updatedAt,
      },
    };
  }
}

function toSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    canvasWidth: project.canvasWidth,
    canvasHeight: project.canvasHeight,
    layerCount: project.layers.length,
    thumbnailUrl: null,
  };
}
