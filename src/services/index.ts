import { env } from "@/config/env";
import { apiClient } from "./api/client";
import { LocalAIProvider } from "./ai";
import { LocalAssetProvider } from "./assets";
import { LocalExportProvider } from "./exports";
import { LocalProjectProvider } from "./projects/LocalProjectProvider";
import { ProjectService } from "./projects/ProjectService";
import { RemoteProjectProvider } from "./projects/RemoteProjectProvider";
import { LocalSettingsProvider } from "./settings";

const projectProvider = env.VITE_PROJECT_PROVIDER === "remote"
  ? new RemoteProjectProvider(apiClient)
  : new LocalProjectProvider();

export const services = {
  projects: new ProjectService(projectProvider),
  assets: new LocalAssetProvider(),
  exports: new LocalExportProvider(),
  ai: new LocalAIProvider(),
  settings: new LocalSettingsProvider(),
};

