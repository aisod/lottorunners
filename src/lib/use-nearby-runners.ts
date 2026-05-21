import { useCallback, useEffect, useState } from "react";
import {
  fetchNearbyRunnerLocations,
  nearbyLocationsToMapRunners,
  shouldUseSimulatedRunners,
  subscribeNearbyRunnerLocations,
} from "./runner-location-service";
import type { LatLng, Runner } from "./types";
import { useSimulatedRunners } from "./use-simulated-runners";

type UseNearbyRunnersOptions = {
  center: LatLng | null;
  excludeRunnerId?: string | null;
  radiusKm?: number;
  enabled?: boolean;
};

/**
 * Live peer runners from Supabase / local GPS store.
 * Falls back to drifting demo runners only in local-dev-without-cloud mode.
 */
export function useNearbyRunners({
  center,
  excludeRunnerId,
  radiusKm = 12,
  enabled = true,
}: UseNearbyRunnersOptions): { runners: Runner[]; loading: boolean } {
  const demoRunners = useSimulatedRunners(shouldUseSimulatedRunners() ? center : null);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !center || shouldUseSimulatedRunners()) {
      setRunners([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const locations = await fetchNearbyRunnerLocations({
        center,
        excludeRunnerId,
        radiusKm,
      });
      setRunners(nearbyLocationsToMapRunners(locations));
    } finally {
      setLoading(false);
    }
  }, [center?.lat, center?.lng, enabled, excludeRunnerId, radiusKm]);

  useEffect(() => {
    if (shouldUseSimulatedRunners()) return;
    void refresh();
    const unsub = subscribeNearbyRunnerLocations(() => {
      void refresh();
    });
    const interval = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, [refresh]);

  if (shouldUseSimulatedRunners()) {
    return { runners: demoRunners, loading: false };
  }

  return { runners, loading };
}
