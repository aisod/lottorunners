import type { MarketplaceJob } from "./jobs-types";

/** Ride/taxi subtypes chosen by customers on the booking flow. */
export const RIDE_CATEGORY_IDS = ["standard", "xl", "women", "corporate"] as const;

export type RideCategoryId = (typeof RIDE_CATEGORY_IDS)[number];

export const RIDE_CATEGORY_LABELS: Record<RideCategoryId, string> = {
  standard: "Standard Ride",
  xl: "XL Ride",
  women: "Women Only",
  corporate: "Corporate Ride",
};

export const ALL_RIDE_CATEGORIES: RideCategoryId[] = [...RIDE_CATEGORY_IDS];

export function isRideCategoryId(value: string): value is RideCategoryId {
  return (RIDE_CATEGORY_IDS as readonly string[]).includes(value);
}

export function normalizeRideCategories(raw: string[] | null | undefined): RideCategoryId[] {
  if (!raw?.length) return [...ALL_RIDE_CATEGORIES];
  const valid = raw.filter(isRideCategoryId);
  return valid.length > 0 ? valid : [...ALL_RIDE_CATEGORIES];
}

/**
 * Ride-only category gate. Truck, errand, and delivery jobs always return true —
 * they are matched by service type only elsewhere.
 */
export function jobMatchesRunnerRideCategory(
  job: Pick<MarketplaceJob, "serviceType" | "subType">,
  rideCategories: ReadonlySet<RideCategoryId>,
): boolean {
  if (job.serviceType !== "ride") {
    return true;
  }
  const subType = job.subType?.trim();
  if (!subType) {
    return true;
  }
  return rideCategories.has(subType as RideCategoryId);
}

export function formatRideCategoriesList(categories: RideCategoryId[]): string {
  if (categories.length === ALL_RIDE_CATEGORIES.length) {
    return "All ride categories";
  }
  return categories.map((id) => RIDE_CATEGORY_LABELS[id]).join(", ");
}

export type RideRunnerProfile = {
  runner_status?: string | null;
  roles?: string[] | null;
  ride_categories?: string[] | null;
};

/** Whether an approved runner profile can receive a ride job by category. */
export function profileEligibleForRideJob(
  profile: RideRunnerProfile,
  job: Pick<MarketplaceJob, "serviceType" | "subType">,
): boolean {
  if (job.serviceType !== "ride") {
    return false;
  }
  if (profile.runner_status !== "approved") {
    return false;
  }
  if (!(profile.roles ?? []).includes("runner")) {
    return false;
  }
  const categories = new Set(normalizeRideCategories(profile.ride_categories ?? undefined));
  return jobMatchesRunnerRideCategory(job, categories);
}
