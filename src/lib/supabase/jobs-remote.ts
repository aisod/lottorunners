import { ensureSupabaseAuthSession } from "@/lib/auth/ensure-session";
import type { MarketplaceJob } from "../jobs-types";
import { getSupabaseClient } from "./client";
import { isUnauthorizedSupabaseError } from "./session";

export type FetchRemoteJobsResult =
  | { ok: true; jobs: MarketplaceJob[] }
  | { ok: false; error: string };

export async function fetchRemoteJobs(): Promise<FetchRemoteJobsResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const { data, error } = await supabase
    .from("marketplace_jobs")
    .select("payload, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, jobs: [] };

  const jobs = data
    .map((row) => row.payload as MarketplaceJob)
    .filter((job): job is MarketplaceJob => Boolean(job?.id));

  return { ok: true, jobs };
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

export type AcceptJobRemoteResult =
  | { ok: true; job: MarketplaceJob }
  | { ok: false; message: string };

/** Atomic accept: only succeeds if job is still pending. */
export async function acceptJobRemote(
  jobId: string,
  runnerId: string,
  runnerName: string,
  runnerPhone?: string,
): Promise<AcceptJobRemoteResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Could not connect to the server." };
  }

  const authed = await ensureSupabaseAuthSession();
  if (!authed) {
    return {
      ok: false,
      message: "Your session expired. Sign out and sign in again.",
    };
  }

  const { data: row, error: readError } = await supabase
    .from("marketplace_jobs")
    .select("payload")
    .eq("id", jobId)
    .maybeSingle();

  if (readError) {
    if (isUnauthorizedSupabaseError(readError)) {
      return {
        ok: false,
        message: "Your session expired or you are not signed in to the server. Sign out, then sign in again.",
      };
    }
    return { ok: false, message: readError.message || "Could not load this job from the server." };
  }

  if (!row) {
    return {
      ok: false,
      message: "This job was not found on the server. Ask the customer to submit again or refresh the dashboard.",
    };
  }

  const current = row.payload as MarketplaceJob;
  if (current.status !== "pending" || current.runnerId) {
    return {
      ok: false,
      message: "This job is no longer available. It may have been taken or cancelled.",
    };
  }

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

  if (writeError) {
    if (isUnauthorizedSupabaseError(writeError)) {
      return {
        ok: false,
        message: "Your session expired or you are not signed in to the server. Sign out, then sign in again.",
      };
    }
    return { ok: false, message: writeError.message || "Could not accept this job on the server." };
  }

  if (!patched) {
    return {
      ok: false,
      message: "Could not accept this job. Another runner may have taken it just now.",
    };
  }

  return { ok: true, job: patched.payload as MarketplaceJob };
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
