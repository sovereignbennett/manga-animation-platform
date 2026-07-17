import type { SettingsProvider } from "@/services/providers";

export class LocalSettingsProvider implements SettingsProvider {
  readonly kind = "local" as const;
}

