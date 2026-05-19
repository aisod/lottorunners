import { useEffect, useState } from "react";
import { getCurrentRunnerId, getRunnerActiveJob } from "./jobs-service";
import { canRunnerAcceptJobs } from "./runner-account";
import { upsertRunnerLocation } from "./runner-location-service";
import { getRunnerOnline } from "./runner-workflow";
import type { LatLng } from "./types";

const MIN_UPLOAD_INTERVAL_MS = 10_000;

/**
 * While the runner is online or has an active job, watch GPS and upsert to Supabase.
 */
export function useRunnerLocationPublisher(): { publishing: boolean; error: string | null } {
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1500);
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const runnerId = getCurrentRunnerId();
    const online = getRunnerOnline();
    const activeJob = runnerId ? getRunnerActiveJob(runnerId) : null;
    const shouldPublish = Boolean(runnerId && canRunnerAcceptJobs(runnerId) && (online || activeJob));

    if (!shouldPublish) {
      setPublishing(false);
      setError(null);
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser.");
      setPublishing(false);
      return;
    }

    let cancelled = false;
    let lastUpload = 0;

    const upload = (coord: LatLng, heading?: number) => {
      const now = Date.now();
      if (now - lastUpload < MIN_UPLOAD_INTERVAL_MS) return;
      lastUpload = now;
      void upsertRunnerLocation(runnerId!, coord, heading).then((ok) => {
        if (!cancelled && !ok) {
          setError("Could not save your location to the server.");
        }
      });
    };

    setPublishing(true);
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        setError(null);
        upload(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          pos.coords.heading ?? undefined,
        );
      },
      (err) => {
        if (cancelled) return;
        setPublishing(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied. Enable location to share live position with customers.");
          return;
        }
        setError("Could not read GPS position.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      setPublishing(false);
    };
  }, [tick]);

  return { publishing, error };
}
