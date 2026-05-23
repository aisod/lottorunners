import type { LatLng } from "./types";

export const GEOLOCATION_TIMEOUT_MS = 20_000;

export const GEOLOCATION_TIMEOUT_MESSAGE =
  "Location request timed out. Try again outdoors or with better signal.";

export type GeolocationPermissionResult =
  | { ok: true; location: LatLng }
  | { ok: false; error: string };

export type GeolocationWatchSnapshot = {
  location: LatLng | null;
  error: string | null;
  loading: boolean;
};

/**
 * Waits for an existing geolocation watch (e.g. useGeolocation) to produce a fix.
 * Pass a getter that reads fresh state (use a ref in React: geoRef.current).
 */
export function waitForGeolocationFix(
  getState: () => GeolocationWatchSnapshot,
  timeoutMs = GEOLOCATION_TIMEOUT_MS,
): Promise<GeolocationPermissionResult> {
  const initial = getState();
  if (initial.location) {
    return Promise.resolve({ ok: true, location: initial.location });
  }
  if (initial.error?.toLowerCase().includes("denied")) {
    return Promise.resolve({ ok: false, error: initial.error });
  }

  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, error: "Geolocation is not supported in this browser." });
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const intervalId = window.setInterval(() => {
      const snapshot = getState();
      if (snapshot.location) {
        window.clearInterval(intervalId);
        resolve({ ok: true, location: snapshot.location });
        return;
      }
      if (snapshot.error?.toLowerCase().includes("denied")) {
        window.clearInterval(intervalId);
        resolve({ ok: false, error: snapshot.error });
        return;
      }
      if (Date.now() >= deadline) {
        window.clearInterval(intervalId);
        resolve({ ok: false, error: GEOLOCATION_TIMEOUT_MESSAGE });
      }
    }, 200);
  });
}

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
          resolve({ ok: false, error: GEOLOCATION_TIMEOUT_MESSAGE });
          return;
        }
        resolve({ ok: false, error: "Could not read your location. Check device settings and try again." });
      },
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
