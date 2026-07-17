import type { AssetProvider } from "@/services/providers";

export class LocalAssetProvider implements AssetProvider {
  readonly kind = "local" as const;
}

