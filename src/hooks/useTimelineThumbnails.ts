import { useEffect, useState } from "react";
import { timelineThumbnailService } from "@/services/timeline/thumbnailService";

export function useTimelineThumbnails(
  layerId: string,
  src: string | undefined,
  count: number,
  enabled: boolean,
) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !src) {
      setThumbnails([]);
      setFailed(false);
      return;
    }

    timelineThumbnailService
      .get(layerId, src, count)
      .then((next) => {
        if (!cancelled) {
          setThumbnails(next);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThumbnails([]);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [count, enabled, layerId, src]);

  return { thumbnails, failed };
}
