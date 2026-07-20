import { useEffect, useState } from "react";
import { useBrushStore } from "@/store/brushStore";

/** Small ring following the pointer, sized by brush params. */
export function BrushCursor() {
  const size = useBrushStore((s) => s.params.size);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    const leave = () => setPos(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerleave", leave); };
  }, []);
  if (!pos) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 rounded-full border border-white/80 mix-blend-difference"
      style={{ left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size }}
    />
  );
}
