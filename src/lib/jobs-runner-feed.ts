import type { MarketplaceJob } from "./jobs-types";
import {
  jobMatchesRunnerRideCategory,
  normalizeRideCategories,
  type RideCategoryId,
} from "./ride-categories";
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

function runnerRideCategorySet(rideCategoryIds: RideCategoryId[]): Set<RideCategoryId> {
  return new Set(normalizeRideCategories(rideCategoryIds));
}

/**
 * Service-type + ride-category visibility for a single pending job.
 * Truck, errand, and delivery: matched by service type only (no category filter).
 * Ride/taxi: also requires job.subType in the runner's ride_categories.
 */
export function runnerCanSeePendingJob(
  job: MarketplaceJob,
  offered: Set<ServiceType>,
  declinedIds: Set<string>,
  rideCategoryIds: RideCategoryId[],
): boolean {
  if (!isJobUnassigned(job) || declinedIds.has(job.id) || !offered.has(job.serviceType)) {
    return false;
  }

  if (job.serviceType === "ride") {
    return jobMatchesRunnerRideCategory(job, runnerRideCategorySet(rideCategoryIds));
  }

  // Truck, errand, delivery — service type only; never ride-category filtered.
  return true;
}

/** Pending jobs in the store that this runner cannot see due to offered-service filter. */
export function countPendingHiddenByServiceFilter(
  jobs: MarketplaceJob[],
  offered: Set<ServiceType>,
  declinedIds: Set<string>,
  rideCategoryIds: RideCategoryId[] = [],
): number {
  if (offered.size === 0) return 0;
  return jobs.filter(
    (j) =>
      isJobUnassigned(j) &&
      !declinedIds.has(j.id) &&
      !runnerCanSeePendingJob(j, offered, declinedIds, rideCategoryIds),
  ).length;
}

export function filterPendingJobsForRunner(
  jobs: MarketplaceJob[],
  offered: Set<ServiceType>,
  declinedIds: Set<string>,
  rideCategoryIds: RideCategoryId[] = [],
): MarketplaceJob[] {
  if (offered.size === 0) return [];
  return jobs.filter((j) => runnerCanSeePendingJob(j, offered, declinedIds, rideCategoryIds));
}
