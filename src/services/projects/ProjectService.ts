import type { ProjectProvider, ProjectSummary, ProjectVersion } from "@/services/providers";
import type { Project } from "./types";

export class ProjectService {
  private readonly provider: ProjectProvider;

  constructor(provider: ProjectProvider) {
    this.provider = provider;
  }

  loadInitialProject() {
    return this.provider.loadInitialProject();
  }

  async saveProject(project: Project): Promise<Project | void> {
    return this.provider.saveProject(project);
  }

  listProjects(): Promise<ProjectSummary[]> {
    return this.provider.listProjects();
  }

  createProject(project: Project) {
    return this.provider.createProject(project);
  }

  getProject(projectId: string) {
    return this.provider.getProject(projectId);
  }

  updateProject(project: Project, version?: number) {
    return this.provider.updateProject(project, version);
  }

  patchProject(projectId: string, patch: Partial<Pick<Project, "name" | "canvasWidth" | "canvasHeight">>) {
    return this.provider.patchProject(projectId, patch);
  }

  deleteProject(projectId: string) {
    return this.provider.deleteProject(projectId);
  }

  createVersion(projectId: string, project: Project, label?: string): Promise<ProjectVersion> {
    return this.provider.createVersion(projectId, project, label);
  }

  listVersions(projectId: string) {
    return this.provider.listVersions(projectId);
  }

  getVersion(projectId: string, versionId: string) {
    return this.provider.getVersion(projectId, versionId);
  }
}
