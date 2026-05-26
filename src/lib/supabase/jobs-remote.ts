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
    return "Database access denied for marketplace_jobs. Run migrations 20260521150000_marketplace_api_grants.sql and 20260521160000_fetch_marketplace_jobs_feed_rpc.sql in Supabase.";
  }
  if (code === "PGRST117" || code === "PGRST105" || lower.includes("405")) {
    return "marketplace_jobs REST API blocked (HTTP 405). Run migrations 20260521150000_marketplace_api_grants.sql and 20260521160000_fetch_marketplace_jobs_feed_rpc.sql in Supabase.";
  }
  if (code === "PGRST202" || lower.includes("fetch_marketplace_jobs_feed")) {
    return "Job feed RPC missing. Run migration 20260521160000_fetch_marketplace_jobs_feed_rpc.sql in Supabase SQL editor.";
  }
  return message;
}

function shouldTryJobsFeedRpc(message: string, code?: string): boolean {
  const lower = message.toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST117" ||
    code === "PGRST105" ||
    code === "PGRST301" ||
    lower.includes("permission denied") ||
    lower.includes("405") ||
    lower.includes("method not allowed")
  );
}

function mapFeedRows(
  data: Array<{ id?: string; payload: unknown; updated_at?: string | null }>,
): RemoteJobRow[] {
  return data
    .map((row) => ({
      job: row.payload as MarketplaceJob,
      updatedAt:
        typeof row.updated_at === "string"
          ? row.updated_at
          : row.updated_at
            ? new Date(row.updated_at).toISOString()
            : new Date().toISOString(),
    }))
    .filter((row): row is RemoteJobRow => Boolean(row.job?.id));
}

async function fetchRemoteJobsViaRpc(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
): Promise<FetchRemoteJobsResult> {
  const { data, error } = await supabase.rpc("fetch_marketplace_jobs_feed");

  if (error) {
    if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
    return { ok: false, error: formatJobsFetchError(error.message, error.code) };
  }

  if (!data || !Array.isArray(data)) return { ok: true, rows: [] };
  return { ok: true, rows: mapFeedRows(data as Array<{ id?: string; payload: unknown; updated_at?: string | null }>) };
}

/** Pull one job by id (for customer tracking while waiting for runner accept). */
export async function fetchRemoteJobById(
  jobId: string,
): Promise<{ ok: true; row: RemoteJobRow } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const ready = await waitForSupabaseSession(6000);
  if (!ready) {
    return { ok: false, error: "Server session not ready." };
  }

  const { data, error } = await supabase
    .from("marketplace_jobs")
    .select("id, payload, updated_at")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
    return { ok: false, error: formatJobsFetchError(error.message, error.code) };
  }

  if (!data?.payload || typeof data.payload !== "object") {
    return { ok: false, error: "Job not found on server." };
  }

  const job = data.payload as MarketplaceJob;
  if (!job.id) return { ok: false, error: "Job not found on server." };

  return {
    ok: true,
    row: {
      job,
      updatedAt:
        typeof data.updated_at === "string"
          ? data.updated_at
          : data.updated_at
            ? new Date(data.updated_at).toISOString()
            : new Date().toISOString(),
    },
  };
}

export async function fetchRemoteJobs(): Promise<FetchRemoteJobsResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const ready = await waitForSupabaseSession(6000);
  if (!ready) {
    return { ok: false, error: "Server session not ready. Sign out, sign in again, then refresh." };
  }

  const { data, error } = await supabase
    .from("marketplace_jobs")
    .select("id, payload, updated_at")
    .order("updated_at", { ascending: false });

  if (!error) {
    if (!data) return { ok: true, rows: [] };
    return { ok: true, rows: mapFeedRows(data) };
  }

  if (isUnauthorizedSupabaseError(error)) {
    resetSupabaseAuthCache();
    return { ok: false, error: "Session expired. Sign out and sign in again." };
  }

  if (shouldTryJobsFeedRpc(error.message, error.code)) {
    const rpcResult = await fetchRemoteJobsViaRpc(supabase);
    if (rpcResult.ok) return rpcResult;
    return {
      ok: false,
      error: `${formatJobsFetchError(error.message, error.code)} RPC fallback: ${rpcResult.error}`,
    };
  }

  return { ok: false, error: formatJobsFetchError(error.message, error.code) };
}

export type UpsertRemoteJobResult = { ok: true } | { ok: false; error: string };

export async function upsertRemoteJob(job: MarketplaceJob): Promise<UpsertRemoteJobResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  // Assigned / in-flight jobs must UPDATE (runners are blocked by jobs_insert RLS on upsert-insert).
  if (job.runnerId || job.status !== "pending") {
    const { data, error } = await supabase
      .from("marketplace_jobs")
      .update({
        payload: job,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (isUnauthorizedSupabaseError(error)) resetSupabaseAuthCache();
      return { ok: false, error: error.message || "Could not update job on the server." };
    }
    if (!data) {
      return { ok: false, error: "Job not found on the server." };
    }
    return { ok: true };
  }

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
