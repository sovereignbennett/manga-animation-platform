import { useEffect, useState } from "react";

/** Returns true after the first client render — safe for SSR. */
export function useHydrated(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}
