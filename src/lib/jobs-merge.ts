import type { MarketplaceJob, MarketplaceJobStatus } from "./jobs-types";
import type { RemoteJobRow } from "./supabase/jobs-remote";

const STATUS_RANK: Record<MarketplaceJobStatus, number> = {
  pending: 0,
  declined: 0,
  cancelled: 0,
  accepted: 1,
  en_route: 2,
  arrived: 3,
  in_progress: 4,
  completed: 5,
};

function runnerKey(job: MarketplaceJob): string {
  return (job.runnerId ?? job.runnerEmail ?? "").trim();
}

function isAssignedJob(job: MarketplaceJob): boolean {
  return Boolean(runnerKey(job)) && job.status !== "pending" && job.status !== "declined";
}

function shouldApplyRemoteJob(existing: MarketplaceJob, remote: MarketplaceJob, remoteMs: number): boolean {
  const localMs = existing.serverUpdatedAt ?? existing.createdAt ?? 0;

  if (isAssignedJob(remote) && !isAssignedJob(existing)) return true;

  if (remoteMs >= localMs) return true;

  return (STATUS_RANK[remote.status] ?? 0) > (STATUS_RANK[existing.status] ?? 0);
}

export function remoteUpdatedMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Merge remote rows into local jobs; keep local copy when it is newer than server. */
export function mergeRemoteJobRows(
  localJobs: MarketplaceJob[],
  remoteRows: RemoteJobRow[],
): MarketplaceJob[] {
  const map = new Map<string, MarketplaceJob>();
  for (const j of localJobs) map.set(j.id, j);

  for (const { job, updatedAt } of remoteRows) {
    const remoteMs = remoteUpdatedMs(updatedAt);
    const withMeta = { ...job, serverUpdatedAt: remoteMs };
    const existing = map.get(job.id);
    if (!existing) {
      map.set(job.id, withMeta);
      continue;
    }
    if (shouldApplyRemoteJob(existing, withMeta, remoteMs)) {
      map.set(job.id, withMeta);
    }
  }

  return [...map.values()];
}
