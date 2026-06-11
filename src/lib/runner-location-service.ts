import { getVerifiedRunnerId } from "./auth/get-verified-runner-id";
import {
  isSupabaseAuthRateLimited,
  supabaseAuthRateLimitMessage,
} from "./auth/ensure-session";
import { getUserDisplayName } from "./auth-users";
import { isWithinRadiusKm } from "./geo-utils";
import { listPendingJobs } from "./jobs-service";
import { isLocalDevAuthAllowed, isSupabaseConfigured } from "./supabase/config";
import { normalizeRunnerId } from "./supabase/session";
import {
  fetchAllRunnerLocationsRemote,
  fetchRunnerLocationRemote,
  subscribeAllRunnerLocationsRemote,
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

function readAllLocalLocations(): RunnerLiveLocation[] {
  return Object.values(readLocalLocations());
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
): Promise<{ ok: true } | { ok: false; unauthorized: boolean; message: string }> {
  const runnerKey = normalizeRunnerId(runnerId);
  const loc: RunnerLiveLocation = {
    runnerId: runnerKey,
    coord,
    heading,
    updatedAt: Date.now(),
  };

  writeLocalLocation(loc);

  if (isSupabaseConfigured()) {
    if (isSupabaseAuthRateLimited()) {
      return {
        ok: false,
        unauthorized: false,
        message: supabaseAuthRateLimitMessage(),
      };
    }

    const verified = await getVerifiedRunnerId();
    if (!verified) {
      return {
        ok: false,
        unauthorized: true,
        message: "Server session is still loading. Wait a moment, then refresh.",
      };
    }
    return upsertRunnerLocationRemote(verified, coord, heading);
  }

  return { ok: true };
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
  const runnerKey = normalizeRunnerId(runnerId);
  let cancelled = false;

  const refresh = () => {
    void fetchRunnerLocation(runnerKey).then((loc) => {
      if (!cancelled) listener(loc);
    });
  };

  refresh();

  const unsubRemote = subscribeRunnerLocationRemote(runnerKey, refresh);

  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(LOCATION_CHANNEL);
    channel.onmessage = (ev: MessageEvent<{ runnerId?: string }>) => {
      if (ev.data?.runnerId === runnerKey) refresh();
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

export type NearbyRunnersQuery = {
  center: LatLng;
  excludeRunnerId?: string | null;
  radiusKm?: number;
  maxAgeMs?: number;
};

const DEFAULT_NEARBY_RADIUS_KM = 12;
const DEFAULT_MAX_AGE_MS = 120_000;

function normalizeRunnerKey(id: string): string {
  return id.trim().toLowerCase();
}

async function loadAllRunnerLocations(): Promise<RunnerLiveLocation[]> {
  if (isSupabaseConfigured()) {
    return fetchAllRunnerLocationsRemote();
  }
  return readAllLocalLocations();
}

export async function fetchNearbyRunnerLocations(query: NearbyRunnersQuery): Promise<RunnerLiveLocation[]> {
  const radiusKm = query.radiusKm ?? DEFAULT_NEARBY_RADIUS_KM;
  const maxAgeMs = query.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const exclude = query.excludeRunnerId ? normalizeRunnerKey(query.excludeRunnerId) : null;

  const all = await loadAllRunnerLocations();

  return all.filter((loc) => {
    if (!isLocationFresh(loc.updatedAt, maxAgeMs)) return false;
    if (exclude && normalizeRunnerKey(loc.runnerId) === exclude) return false;
    return isWithinRadiusKm(query.center, loc.coord, radiusKm);
  });
}

export function subscribeNearbyRunnerLocations(
  listener: () => void,
): () => void {
  if (isSupabaseConfigured()) {
    return subscribeAllRunnerLocationsRemote(listener);
  }

  let channel: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(LOCATION_CHANNEL);
    channel.onmessage = () => listener();
  }

  return () => channel?.close();
}

function runnerDisplayName(runnerId: string): string {
  return getUserDisplayName(runnerId) ?? runnerId.split("@")[0] ?? "Runner";
}

export function nearbyLocationsToMapRunners(locations: RunnerLiveLocation[]): Runner[] {
  return locations.map((loc) =>
    runnerLocationToMapRunner(loc, {
      name: runnerDisplayName(loc.runnerId),
      vehicle: "delivery",
    }),
  );
}

/** Pending customer requests with pickup inside radius (demand indicator). */
export function countPendingDemandNear(center: LatLng, radiusKm = DEFAULT_NEARBY_RADIUS_KM): number {
  return listPendingJobs().filter((job) => isWithinRadiusKm(center, job.pickup, radiusKm)).length;
}
