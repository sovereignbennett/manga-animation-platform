interface ThumbnailCacheEntry {
  src: string;
  thumbnails: string[];
  pending?: Promise<string[]>;
}

const cache = new Map<string, ThumbnailCacheEntry>();

const waitForEvent = (target: EventTarget, eventName: string) =>
  new Promise<void>((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`${eventName} failed`));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });

async function generateVideoThumbnails(src: string, count: number): Promise<string[]> {
  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";

  await waitForEvent(video, "loadedmetadata");

  const canvas = document.createElement("canvas");
  const width = 144;
  const height = 80;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
  const total = Math.max(1, Math.min(12, Math.round(count)));
  const out: string[] = [];

  for (let i = 0; i < total; i += 1) {
    const t = total === 1 ? duration / 2 : (duration * i) / (total - 1);
    video.currentTime = Math.min(duration - 0.05, Math.max(0, t));
    await waitForEvent(video, "seeked");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    out.push(canvas.toDataURL("image/jpeg", 0.7));
  }

  video.removeAttribute("src");
  video.load();
  return out;
}

export const timelineThumbnailService = {
  get(layerId: string, src: string, count: number): Promise<string[]> {
    const requested = Math.max(1, Math.min(12, Math.round(count)));
    const existing = cache.get(layerId);
    if (existing && existing.src === src && existing.thumbnails.length >= requested) {
      return Promise.resolve(existing.thumbnails.slice(0, requested));
    }
    if (existing?.pending && existing.src === src) return existing.pending;

    const pending = generateVideoThumbnails(src, requested)
      .then((thumbnails) => {
        cache.set(layerId, { src, thumbnails });
        return thumbnails;
      })
      .catch((error) => {
        cache.delete(layerId);
        throw error;
      });

    cache.set(layerId, { src, thumbnails: existing?.src === src ? existing.thumbnails : [], pending });
    return pending;
  },
};
