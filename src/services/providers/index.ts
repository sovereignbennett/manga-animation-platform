import type { MaybePromise, Project } from "@/services/projects/types";

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvasWidth: number;
  canvasHeight: number;
  layerCount: number;
  thumbnailUrl?: string | null;
}

export interface ProjectVersion {
  id: string;
  projectId?: string;
  number: number;
  label?: string | null;
  createdAt: number;
}

export interface ProjectProvider {
  loadInitialProject(): MaybePromise<Project | null>;
  saveProject(project: Project): MaybePromise<Project | void>;
  listProjects(): Promise<ProjectSummary[]>;
  createProject(project: Project): Promise<{ project: Project; version?: number }>;
  getProject(projectId: string): Promise<{ project: Project; version?: number }>;
  updateProject(project: Project, version?: number): Promise<{ project: Project; version?: number }>;
  patchProject(projectId: string, patch: Partial<Pick<Project, "name" | "canvasWidth" | "canvasHeight">>): Promise<{ project: ProjectSummary; version?: number }>;
  deleteProject(projectId: string): Promise<void>;
  createVersion(projectId: string, project: Project, label?: string): Promise<ProjectVersion>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
  getVersion(projectId: string, versionId: string): Promise<{ project: Project; version: ProjectVersion }>;
}

export interface AssetProvider {
  readonly kind: "local" | "remote" | "mock";
}

export interface ExportProvider {
  readonly kind: "local" | "remote" | "mock";
}

export interface AIProvider {
  readonly kind: "local" | "remote" | "mock";
}

export interface SettingsProvider {
  readonly kind: "local" | "remote" | "mock";
}
