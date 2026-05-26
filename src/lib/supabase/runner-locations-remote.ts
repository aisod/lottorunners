import { ensureSupabaseAuthSession, resetSupabaseAuthCache } from "@/lib/auth/ensure-session";
import type { RunnerLiveLocation } from "../runner-location-types";
import { getSupabaseClient } from "./client";
import { isUnauthorizedSupabaseError, normalizeRunnerId } from "./session";

type RunnerLocationRow = {
  runner_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  updated_at: string;
};

function rowToLocation(row: RunnerLocationRow): RunnerLiveLocation {
  return {
    runnerId: row.runner_id,
    coord: { lat: row.lat, lng: row.lng },
    heading: row.heading ?? undefined,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function fetchAllRunnerLocationsRemote(): Promise<RunnerLiveLocation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("runner_locations")
    .select("runner_id, lat, lng, heading, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return (data as RunnerLocationRow[]).map(rowToLocation);
}

export async function fetchRunnerLocationRemote(runnerId: string): Promise<RunnerLiveLocation | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("runner_locations")
    .select("runner_id, lat, lng, heading, updated_at")
    .eq("runner_id", normalizeRunnerId(runnerId))
    .maybeSingle();

  if (error || !data) return null;
  return rowToLocation(data as RunnerLocationRow);
}

export type UpsertRunnerLocationResult =
  | { ok: true }
  | { ok: false; unauthorized: boolean; message: string };

export async function upsertRunnerLocationRemote(
  runnerId: string,
  coord: { lat: number; lng: number },
  heading?: number,
): Promise<UpsertRunnerLocationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, unauthorized: false, message: "Supabase client unavailable." };
  }

  const authed = await ensureSupabaseAuthSession();
  if (!authed) {
    return {
      ok: false,
      unauthorized: true,
      message: "Session expired. Please sign in again.",
    };
  }

  const { error } = await supabase.from("runner_locations").upsert(
    {
      runner_id: normalizeRunnerId(runnerId),
      lat: coord.lat,
      lng: coord.lng,
      heading: heading ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "runner_id" },
  );

  if (error) {
    const unauthorized = isUnauthorizedSupabaseError(error);
    if (unauthorized) resetSupabaseAuthCache();
    return {
      ok: false,
      unauthorized,
      message: unauthorized
        ? "Your session expired or you are not signed in to the server. Sign out, then sign in again."
        : error.message || "Could not save your location to the server.",
    };
  }

  return { ok: true };
}

export function subscribeAllRunnerLocationsRemote(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("runner-locations-all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "runner_locations" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeRunnerLocationRemote(
  runnerId: string,
  onChange: () => void,
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`runner-location-${runnerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "runner_locations",
        filter: `runner_id=eq.${runnerId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
