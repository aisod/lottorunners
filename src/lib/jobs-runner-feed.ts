import type { MarketplaceJob } from "./jobs-types";
import type { ServiceType } from "./types";
import type { RunnerOfferedServiceId } from "./runner-settings";

/** Runner UI uses `taxi`; marketplace jobs use `ride`. */
export function runnerOfferedIdToServiceType(id: RunnerOfferedServiceId): ServiceType {
  return id === "taxi" ? "ride" : id;
}

export function runnerOfferedIdsToServiceTypes(ids: RunnerOfferedServiceId[]): Set<ServiceType> {
  if (!ids.length) return new Set();
  return new Set(ids.map(runnerOfferedIdToServiceType));
}

export function isJobUnassigned(job: MarketplaceJob): boolean {
  const assigned = (job.runnerId ?? job.runnerEmail ?? "").trim();
  return job.status === "pending" && !assigned;
}

/** Pending jobs in the store that this runner cannot see due to offered-service filter. */
export function countPendingHiddenByServiceFilter(
  jobs: MarketplaceJob[],
  offered: Set<ServiceType>,
  declinedIds: Set<string>,
): number {
  if (offered.size === 0) return 0;
  return jobs.filter(
    (j) =>
      isJobUnassigned(j) &&
      !declinedIds.has(j.id) &&
      !offered.has(j.serviceType),
  ).length;
}

export function filterPendingJobsForRunner(
  jobs: MarketplaceJob[],
  offered: Set<ServiceType>,
  declinedIds: Set<string>,
): MarketplaceJob[] {
  if (offered.size === 0) return [];
  return jobs.filter(
    (j) =>
      isJobUnassigned(j) &&
      !declinedIds.has(j.id) &&
      offered.has(j.serviceType),
  );
}
