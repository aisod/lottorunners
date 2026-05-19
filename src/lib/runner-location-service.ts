import { isLocalDevAuthAllowed, isSupabaseConfigured } from "./supabase/config";
import {
  fetchRunnerLocationRemote,
  subscribeRunnerLocationRemote,
  upsertRunnerLocationRemote,
} from "./supabase/runner-locations-remote";
import type { RunnerLiveLocation } from "./runner-location-types";
import type { LatLng, Runner, ServiceType } from "./types";

const LOCAL_LOCATIONS_KEY = "lr-runner-locations-v1";
const LOCATION_CHANNEL = "lr-runner-locations-sync";

/** Simulated drifting runners only when cloud is off and local dev is explicitly enabled. */
export function shouldUseSimulatedRunners(): boolean {
  return !isSupabaseConfigured() && isLocalDevAuthAllowed();
}

function readLocalLocations(): Record<string, RunnerLiveLocation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_LOCATIONS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, RunnerLiveLocation>;
  } catch {
    return {};
  }
}

function writeLocalLocation(loc: RunnerLiveLocation): void {
  if (typeof window === "undefined") return;
  const all = readLocalLocations();
  all[loc.runnerId] = loc;
  window.localStorage.setItem(LOCAL_LOCATIONS_KEY, JSON.stringify(all));
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(LOCATION_CHANNEL);
    ch.postMessage({ type: "location-updated", runnerId: loc.runnerId });
    ch.close();
  }
}

export async function upsertRunnerLocation(
  runnerId: string,
  coord: LatLng,
  heading?: number,
): Promise<boolean> {
  const loc: RunnerLiveLocation = {
    runnerId,
    coord,
    heading,
    updatedAt: Date.now(),
  };

  writeLocalLocation(loc);

  if (isSupabaseConfigured()) {
    return upsertRunnerLocationRemote(runnerId, coord, heading);
  }

  return true;
}

export async function fetchRunnerLocation(runnerId: string): Promise<RunnerLiveLocation | null> {
  if (isSupabaseConfigured()) {
    const remote = await fetchRunnerLocationRemote(runnerId);
    if (remote) {
      writeLocalLocation(remote);
      return remote;
    }
  }

  return readLocalLocations()[runnerId] ?? null;
}

export function subscribeRunnerLocation(
  runnerId: string,
  listener: (location: RunnerLiveLocation | null) => void,
): () => void {
  let cancelled = false;

  const refresh = () => {
    void fetchRunnerLocation(runnerId).then((loc) => {
      if (!cancelled) listener(loc);
    });
  };

  refresh();

  const unsubRemote = subscribeRunnerLocationRemote(runnerId, refresh);

  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(LOCATION_CHANNEL);
    channel.onmessage = (ev: MessageEvent<{ runnerId?: string }>) => {
      if (ev.data?.runnerId === runnerId) refresh();
    };
  }

  return () => {
    cancelled = true;
    unsubRemote();
    channel?.close();
  };
}

export function runnerLocationToMapRunner(
  location: RunnerLiveLocation,
  profile: { name: string; vehicle: ServiceType },
): Runner {
  return {
    id: location.runnerId,
    name: profile.name,
    vehicle: profile.vehicle,
    rating: 4.9,
    plate: "",
    position: location.coord,
    heading: location.heading ?? 0,
  };
}

export function formatLocationFreshness(updatedAt: number): string {
  const ageSec = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (ageSec < 60) return "Updated just now";
  if (ageSec < 3600) return `Updated ${Math.floor(ageSec / 60)}m ago`;
  return `Updated ${Math.floor(ageSec / 3600)}h ago`;
}

export function isLocationFresh(updatedAt: number, maxAgeMs = 120_000): boolean {
  return Date.now() - updatedAt <= maxAgeMs;
}
