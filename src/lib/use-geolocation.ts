import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/types";
import { WINDHOEK } from "@/lib/geo-defaults";

interface GeoState {
  location: LatLng | null;
  error: string | null;
  loading: boolean;
}

export type UseGeolocationOptions = {
  /**
   * When false, permission errors leave location null (map may still center on Windhoek for display only).
   * Production runner/tracking flows should set this to false.
   */
  fallbackOnError?: boolean;
  /** Poll position while mounted (runner online / active job). */
  watch?: boolean;
};

export function useGeolocation(options: UseGeolocationOptions = {}): GeoState {
  const { fallbackOnError = true, watch = false } = options;
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        location: fallbackOnError ? { lat: WINDHOEK[0], lng: WINDHOEK[1] } : null,
        error: "Geolocation is not supported in this browser.",
        loading: false,
      });
      return;
    }

    let cancelled = false;

    const applySuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
      setState({
        location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        error: null,
        loading: false,
      });
    };

    const applyError = (err?: GeolocationPositionError) => {
      if (cancelled) return;
      const denied = err?.code === 1;
      setState({
        location: fallbackOnError ? { lat: WINDHOEK[0], lng: WINDHOEK[1] } : null,
        error: denied
          ? "Location permission denied."
          : "Couldn't get your location.",
        loading: false,
      });
    };

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(applySuccess, applyError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      });
      return () => {
        cancelled = true;
        navigator.geolocation.clearWatch(watchId);
      };
    }

    const timeout = setTimeout(() => {
      if (cancelled) return;
      setState((s) =>
        s.loading
          ? {
              location: fallbackOnError ? { lat: WINDHOEK[0], lng: WINDHOEK[1] } : null,
              error: "Location request timed out.",
              loading: false,
            }
          : s,
      );
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        applySuccess(pos);
      },
      (err) => {
        clearTimeout(timeout);
        applyError(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [fallbackOnError, watch]);

  return state;
}
