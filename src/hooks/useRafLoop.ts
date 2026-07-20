import { useEffect, useRef } from "react";

/**
 * Runs `cb(dtSeconds, tSeconds)` every animation frame while `active`.
 * Uses a ref for the callback so callers do not need to memoize it.
 */
export function useRafLoop(cb: (dt: number, t: number) => void, active = true): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      cbRef.current(dt, (now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
