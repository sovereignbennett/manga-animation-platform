import { useEffect } from "react";

/** Register a keyboard shortcut. Example: useHotkeys("Space", togglePlay). */
export function useHotkeys(combo: string, handler: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    const parts = combo.toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const wantCtrl = parts.includes("ctrl") || parts.includes("cmd");
    const wantShift = parts.includes("shift");
    const wantAlt = parts.includes("alt");
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key && e.code.toLowerCase() !== key) return;
      if (!!(e.ctrlKey || e.metaKey) !== wantCtrl) return;
      if (e.shiftKey !== wantShift) return;
      if (e.altKey !== wantAlt) return;
      handler(e);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [combo, handler]);
}
