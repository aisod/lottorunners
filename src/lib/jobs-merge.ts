import type { MarketplaceJob } from "./jobs-types";
import type { RemoteJobRow } from "./supabase/jobs-remote";

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
    const localMs = existing.serverUpdatedAt ?? existing.createdAt ?? 0;
    if (remoteMs >= localMs) {
      map.set(job.id, withMeta);
    }
  }

  return [...map.values()];
}
