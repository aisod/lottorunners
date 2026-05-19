import type { LatLng } from "./types";

export type GeolocationPermissionResult =
  | { ok: true; location: LatLng }
  | { ok: false; error: string };

/** One-shot position read; triggers the browser permission prompt when needed. */
export function requestCurrentPosition(): Promise<GeolocationPermissionResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ ok: false, error: "Geolocation is not supported in this browser." });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      (err) => {
        const code = err.code;
        if (code === err.PERMISSION_DENIED) {
          resolve({
            ok: false,
            error: "Location permission denied. Enable location in your browser settings to go online.",
          });
          return;
        }
        if (code === err.TIMEOUT) {
          resolve({ ok: false, error: "Location request timed out. Try again outdoors or with better signal." });
          return;
        }
        resolve({ ok: false, error: "Could not read your location. Check device settings and try again." });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
