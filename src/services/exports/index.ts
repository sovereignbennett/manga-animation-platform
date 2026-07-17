import type { ExportProvider } from "@/services/providers";

export class LocalExportProvider implements ExportProvider {
  readonly kind = "local" as const;
}

