import {
  ensureSupabaseAuthSession,
  resetSupabaseAuthCache,
  waitForSupabaseSession,
} from "@/lib/auth/ensure-session";
import type { MarketplaceJob } from "../jobs-types";
import { getSupabaseClient } from "./client";
import { isUnauthorizedSupabaseError } from "./session";

export type RemoteJobRow = {
  job: MarketplaceJob;
  updatedAt: string;
};

export type FetchRemoteJobsResult =
  | { ok: true; rows: RemoteJobRow[] }
  | { ok: false; error: string };

function formatJobsFetchError(message: string, code?: string): string {
  const lower = message.toLowerCase();
  if (code === "42501" || lower.includes("permission denied")) {
    return "Database access denied for marketplace_jobs. Run migration 20260521150000_marketplace_api_grants.sql in Supabase.";
  }
  if (code === "PGRST117" || code === "PGRST105" || message.includes("405")) {
    return "marketplace_jobs API is not reachable (HTTP 405). Enable the table in Supabase API settings and run migration 20260521150000_marketplace_api_grants.sql.";
  }
  return message;
}

export async function fetchRemoteJobs(): Promise<FetchRemoteJobsResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const ready = await waitForSupabaseSession(5000);
  if (!ready) {
    return { ok: false, error: "Server session not ready. Wait a moment and refresh, or sign in again." };
  }

  const { data, error } = await supabase
    .from("marketplace_jobs")
    .select("payload, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
    return { ok: false, error: formatJobsFetchError(error.message, error.code) };
  }
  if (!data) return { ok: true, rows: [] };

  const rows = data
    .map((row) => ({
      job: row.payload as MarketplaceJob,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    }))
    .filter((row): row is RemoteJobRow => Boolean(row.job?.id));

  return { ok: true, rows };
}

export type UpsertRemoteJobResult = { ok: true } | { ok: false; error: string };

export async function upsertRemoteJob(job: MarketplaceJob): Promise<UpsertRemoteJobResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const { error } = await supabase.from("marketplace_jobs").upsert({
    id: job.id,
    payload: job,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
    return { ok: false, error: error.message || "Could not save job to the server." };
  }

  return { ok: true };
}

export async function upsertRemoteJobs(jobs: MarketplaceJob[]): Promise<UpsertRemoteJobResult> {
  if (jobs.length === 0) return { ok: true };
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const rows = jobs.map((job) => ({
    id: job.id,
    payload: job,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("marketplace_jobs").upsert(rows);

  if (error) {
    if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
    return { ok: false, error: error.message || "Could not save jobs to the server." };
  }

  return { ok: true };
}

export type AcceptJobRemoteResult =
  | { ok: true; job: MarketplaceJob }
  | { ok: false; message: string };

/** Atomic accept via security definer RPC (pending + approved runner only). */
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

  const { data, error } = await supabase.rpc("accept_marketplace_job", {
    p_job_id: jobId,
    p_runner_name: runnerName,
    p_runner_phone: runnerPhone ?? null,
  });

  if (error) {
    if (isUnauthorizedSupabaseError(error)) {
      resetSupabaseAuthCache();
      return {
        ok: false,
        message: "Your session expired or you are not signed in to the server. Sign out, then sign in again.",
      };
    }
    const msg = error.message || "Could not accept this job on the server.";
    if (msg.includes("no longer available") || msg.includes("another runner")) {
      return { ok: false, message: "Could not accept this job. Another runner may have taken it just now." };
    }
    if (msg.includes("approved")) {
      return { ok: false, message: "Your runner profile must be approved before you can accept jobs." };
    }
    return { ok: false, message: msg };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, message: "Could not accept this job on the server." };
  }

  const job = data as MarketplaceJob;
  if (!job.id) {
    return { ok: false, message: "Could not accept this job on the server." };
  }

  return { ok: true, job: { ...job, runnerId: job.runnerId ?? runnerId, runnerEmail: job.runnerEmail ?? runnerId } };
}

export function subscribeRemoteJobs(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("marketplace-jobs-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "marketplace_jobs" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
