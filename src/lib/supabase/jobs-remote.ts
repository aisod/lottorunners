import type { MarketplaceJob } from "../jobs-types";
import { getSupabaseClient } from "./client";

export async function fetchRemoteJobs(): Promise<MarketplaceJob[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("marketplace_jobs")
    .select("payload, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => row.payload as MarketplaceJob)
    .filter((job): job is MarketplaceJob => Boolean(job?.id));
}

export async function upsertRemoteJob(job: MarketplaceJob): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from("marketplace_jobs").upsert({
    id: job.id,
    payload: job,
    updated_at: new Date().toISOString(),
  });
}

export async function upsertRemoteJobs(jobs: MarketplaceJob[]): Promise<void> {
  if (jobs.length === 0) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const rows = jobs.map((job) => ({
    id: job.id,
    payload: job,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from("marketplace_jobs").upsert(rows);
}

/** Atomic accept: only succeeds if job is still pending. */
export async function acceptJobRemote(
  jobId: string,
  runnerId: string,
  runnerName: string,
  runnerPhone?: string,
): Promise<MarketplaceJob | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: row, error: readError } = await supabase
    .from("marketplace_jobs")
    .select("payload")
    .eq("id", jobId)
    .maybeSingle();

  if (readError || !row) return null;

  const current = row.payload as MarketplaceJob;
  if (current.status !== "pending" || current.runnerId) return null;

  const updated: MarketplaceJob = {
    ...current,
    runnerId,
    runnerEmail: runnerId,
    runnerName,
    runnerPhone,
    status: "accepted",
    acceptedAt: Date.now(),
  };

  const { data: patched, error: writeError } = await supabase
    .from("marketplace_jobs")
    .update({
      payload: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("payload->>status", "pending")
    .select("payload")
    .maybeSingle();

  if (writeError || !patched) return null;
  return patched.payload as MarketplaceJob;
}

export function subscribeRemoteJobs(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("marketplace-jobs")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "marketplace_jobs" },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
