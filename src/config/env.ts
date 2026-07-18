type ProjectProviderMode = "local" | "remote";
console.log(import.meta.env.VITE_API_URL);
const providerMode = (import.meta.env.VITE_PROJECT_PROVIDER ?? "local").toLowerCase();

export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL ?? "",
  VITE_PROJECT_PROVIDER: providerMode === "remote" ? "remote" : "local",
} satisfies {
  VITE_API_URL: string;
  VITE_PROJECT_PROVIDER: ProjectProviderMode;
};

