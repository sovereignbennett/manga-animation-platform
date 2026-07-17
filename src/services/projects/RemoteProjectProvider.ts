import { ApiError, type ApiClient } from "@/services/api/client";
import { apiClient } from "@/services/api/client";
import type { ProjectProvider, ProjectSummary, ProjectVersion } from "@/services/providers";
import type { Project } from "./types";

type ProjectEnvelope = {
  project: Project;
  version?: number;
};

export class RemoteProjectProvider implements ProjectProvider {
  private readonly client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async loadInitialProject(): Promise<Project | null> {
    const projects = await this.listProjects();
    const first = projects[0];
    if (!first) return null;
    const { project } = await this.getProject(first.id);
    return project;
  }

  async saveProject(project: Project): Promise<Project | void> {
    try {
      const response = await this.updateProject(project);
      return response.project;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        const response = await this.createProject(project);
        return response.project;
      }
      throw error;
    }
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const response = await this.client.request<{ projects: ProjectSummary[] }>("/api/v1/projects");
    return response.projects;
  }

  async createProject(project: Project): Promise<ProjectEnvelope> {
    return this.client.request<ProjectEnvelope>("/api/v1/projects", {
      method: "POST",
      body: {
        name: project.name,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        initialState: {
          layers: project.layers,
          order: project.order,
        },
      },
    });
  }

  async getProject(projectId: string): Promise<ProjectEnvelope> {
    return this.client.request<ProjectEnvelope>(`/api/v1/projects/${projectId}`);
  }

  async updateProject(project: Project, version?: number): Promise<ProjectEnvelope> {
    return this.client.request<ProjectEnvelope>(`/api/v1/projects/${project.id}`, {
      method: "PUT",
      headers: version === undefined ? undefined : { "If-Match": String(version) },
      body: {
        project,
      },
    });
  }

  async patchProject(projectId: string, patch: Partial<Pick<Project, "name" | "canvasWidth" | "canvasHeight">>): Promise<{ project: ProjectSummary; version?: number }> {
    return this.client.request<{ project: ProjectSummary; version?: number }>(`/api/v1/projects/${projectId}`, {
      method: "PATCH",
      body: patch,
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.request<void>(`/api/v1/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  async createVersion(projectId: string, project: Project, label?: string): Promise<ProjectVersion> {
    const response = await this.client.request<{ version: ProjectVersion }>(`/api/v1/projects/${projectId}/versions`, {
      method: "POST",
      body: {
        label,
        project,
      },
    });
    return response.version;
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    const response = await this.client.request<{ versions: ProjectVersion[] }>(`/api/v1/projects/${projectId}/versions`);
    return response.versions;
  }

  async getVersion(projectId: string, versionId: string): Promise<{ project: Project; version: ProjectVersion }> {
    return this.client.request<{ project: Project; version: ProjectVersion }>(`/api/v1/projects/${projectId}/versions/${versionId}`);
  }
}
