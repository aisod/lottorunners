import { useEffect, useMemo, useState } from "react";
import { getVerifiedRunnerId } from "@/lib/auth/get-verified-runner-id";
import { getAuthSession } from "@/lib/auth-session";
import { normalizeRunnerId } from "@/lib/supabase/session";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getRunnerActiveJob } from "./jobs-service";
import { canRunnerAcceptJobs } from "./runner-account";
import { upsertRunnerLocation } from "./runner-location-service";
import { isSupabaseConfigured } from "./supabase/config";
import { getRunnerOnline } from "./runner-workflow";
import type { LatLng } from "./types";

const MIN_UPLOAD_INTERVAL_MS = 10_000;

/**
 * While the runner is online or has an active job, watch GPS and upsert to Supabase.
 */
export function useRunnerLocationPublisher(): { publishing: boolean; error: string | null } {
  const { session: supabaseSession } = useSupabaseSession();
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [online, setOnline] = useState(false);

  const runnerId = useMemo(() => {
    const email = supabaseSession?.user?.email ?? getAuthSession()?.email;
    if (!email) return null;
    const app = getAuthSession();
    if (app && app.activeRole !== "runner") return null;
    return normalizeRunnerId(email);
  }, [supabaseSession?.user?.email]);

  useEffect(() => {
    setOnline(getRunnerOnline());
    const refresh = () => setOnline(getRunnerOnline());
    window.addEventListener("storage", refresh);
    window.addEventListener("lr-runner-online-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("lr-runner-online-changed", refresh);
    };
  }, []);

  useEffect(() => {
    const activeJob = runnerId ? getRunnerActiveJob(runnerId) : null;
    const shouldPublish = Boolean(runnerId && canRunnerAcceptJobs(runnerId) && (online || activeJob));

    if (!shouldPublish) {
      setPublishing(false);
      if (!runnerId && isSupabaseConfigured() && online) {
        setError("Sign in again to share live location.");
      } else if (!runnerId) {
        setError(null);
      }
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser.");
      setPublishing(false);
      return;
    }

    let cancelled = false;
    let lastUpload = 0;
    let watchId: number | null = null;

    const upload = async (coord: LatLng, heading?: number) => {
      // Don't publish without a valid JWT — RLS rejects and errors can trigger refresh storms.
      const verifiedId = await getVerifiedRunnerId();
      if (!verifiedId) {
        return;
      }

      const now = Date.now();
      if (now - lastUpload < MIN_UPLOAD_INTERVAL_MS) return;
      lastUpload = now;

      if (!runnerId) {
        if (!cancelled) {
          setError("Sign in again to share live location.");
          setPublishing(false);
        }
        return;
      }

      const result = await upsertRunnerLocation(runnerId, coord, heading);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        if (result.unauthorized) setPublishing(false);
      }
    };

    setPublishing(true);
    setError(null);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        setError(null);
        void upload(
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
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setPublishing(false);
    };
  }, [runnerId, online]);

  return { publishing, error };
}
