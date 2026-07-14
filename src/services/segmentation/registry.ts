/**
 * Provider registry with dependency injection.
 *
 * The editor never imports a concrete provider. It asks the registry for
 * a strategy ("foreground" or "parts") and receives the currently-bound
 * implementation. Providers can be swapped at runtime (e.g. onboarding
 * flow, feature flag, user setting).
 */

import type {
  SegmentationProvider,
  SegmentationOptions,
  SegmentationResult,
} from "../../types/segmentation";

export type SegmentationStrategy = "foreground" | "parts" | "hybrid";

type Registry = {
  foreground: SegmentationProvider | null;
  parts: SegmentationProvider | null;
};

const registry: Registry = { foreground: null, parts: null };

export function registerProvider(role: keyof Registry, provider: SegmentationProvider) {
  registry[role] = provider;
}

export function getProvider(role: keyof Registry): SegmentationProvider {
  const p = registry[role];
  if (!p) throw new Error(`No segmentation provider registered for "${role}"`);
  return p;
}

/**
 * Run the hybrid pipeline: client-side foreground first, then AI parts,
 * then compose part masks against the foreground so leaked background
 * pixels are dropped. Each stage is optional and can be swapped.
 */
export async function segmentHybrid(
  imageSrc: string,
  opts: SegmentationOptions = {},
): Promise<SegmentationResult> {
  const fgProvider = getProvider("foreground");
  const partsProvider = getProvider("parts");

  const t0 = performance.now();
  opts.onProgress?.(0.05, "Preparing image");

  const fg = await fgProvider.segment(imageSrc, {
    ...opts,
    foregroundOnly: true,
    onProgress: (p, stage) => opts.onProgress?.(0.05 + p * 0.45, stage),
  });
  if (opts.signal?.aborted) throw new Error("aborted");

  opts.onProgress?.(0.5, "Detecting body parts");
  const parts = await partsProvider.segment(imageSrc, {
    ...opts,
    onProgress: (p, stage) => opts.onProgress?.(0.5 + p * 0.5, stage),
  });

  opts.onProgress?.(1, "Done");
  return {
    sourceWidth: fg.sourceWidth,
    sourceHeight: fg.sourceHeight,
    provider: "hybrid",
    foreground: fg.foreground,
    parts: parts.parts,
    modelTag: `hybrid(${fg.modelTag ?? fg.provider}+${parts.modelTag ?? parts.provider})`,
    durationMs: performance.now() - t0,
  };
}
