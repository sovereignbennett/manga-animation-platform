import type { AIProvider } from "@/services/providers";

export class LocalAIProvider implements AIProvider {
  readonly kind = "local" as const;
}

