import type { WaveformPeaks } from "@/services/audio";
import { useEffect, useRef } from "react";

interface Props { peaks?: WaveformPeaks | Float32Array; height?: number; color?: string }

/** Draw a min/max waveform. Accepts either raw peaks or a Float32Array of samples. */
export function Waveform({ peaks, height = 40, color = "#58c98a" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = color;
    const mid = rect.height / 2;
    if (!peaks) {
      ctx.fillRect(0, mid - 0.5, rect.width, 1);
      return;
    }
    const data = "data" in peaks ? peaks.data : peaks;
    const count = "bucketCount" in peaks ? peaks.bucketCount : data.length / 2;
    const step = rect.width / count;
    for (let i = 0; i < count; i++) {
      const mn = data[i * 2];
      const mx = data[i * 2 + 1];
      const y1 = mid + mn * mid;
      const y2 = mid + mx * mid;
      ctx.fillRect(i * step, y1, Math.max(1, step - 0.5), Math.max(1, y2 - y1));
    }
  }, [peaks, color]);
  return <canvas ref={ref} style={{ height }} className="block w-full" />;
}
