import type { RunnerLiveLocation } from "../runner-location-types";
import { getSupabaseClient } from "./client";

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

export async function fetchRunnerLocationRemote(runnerId: string): Promise<RunnerLiveLocation | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("runner_locations")
    .select("runner_id, lat, lng, heading, updated_at")
    .eq("runner_id", runnerId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToLocation(data as RunnerLocationRow);
}

export async function upsertRunnerLocationRemote(
  runnerId: string,
  coord: { lat: number; lng: number },
  heading?: number,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from("runner_locations").upsert({
    runner_id: runnerId,
    lat: coord.lat,
    lng: coord.lng,
    heading: heading ?? null,
    updated_at: new Date().toISOString(),
  });

  return !error;
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
