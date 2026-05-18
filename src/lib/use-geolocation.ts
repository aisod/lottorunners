import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/types";
import { WINDHOEK } from "@/lib/geo-defaults";

interface GeoState {
  location: LatLng | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        location: { lat: WINDHOEK[0], lng: WINDHOEK[1] },
        error: "Geolocation not supported — using Windhoek",
        loading: false,
      });
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setState((s) =>
        s.location
          ? s
          : {
              location: { lat: WINDHOEK[0], lng: WINDHOEK[1] },
              error: "Couldn't get your location — using Windhoek",
              loading: false,
            },
      );
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        clearTimeout(timeout);
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          loading: false,
        });
      },
      () => {
        if (cancelled) return;
        clearTimeout(timeout);
        setState({
          location: { lat: WINDHOEK[0], lng: WINDHOEK[1] },
          error: "Location permission denied — using Windhoek",
          loading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return state;
}
