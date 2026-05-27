import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Re-runs route beforeLoad guards after hydration so localStorage-backed auth is visible.
 */
export function AuthRouteHydrator() {
  const router = useRouter();
  const didInvalidate = useRef(false);

  useEffect(() => {
    if (didInvalidate.current) return;
    didInvalidate.current = true;
    void router.invalidate();
  }, [router]);

  return null;
}
