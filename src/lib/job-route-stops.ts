import type { MarketplaceJob } from "./jobs-types";
import type { LatLng } from "./types";

export interface JobRouteStop {
  address: string;
  coord: LatLng;
  notes?: string;
  completedAt?: number;
}

export function getJobRouteStops(job: MarketplaceJob): JobRouteStop[] {
  if (job.batchStops?.length) return job.batchStops;
  return [{ address: job.dropoffAddress, coord: job.dropoff }];
}

export function isMultiStopJob(job: MarketplaceJob): boolean {
  return (job.batchStops?.length ?? 0) > 1;
}

export function getActiveStopIndex(job: MarketplaceJob): number {
  const stops = getJobRouteStops(job);
  const raw = job.currentStopIndex ?? 0;
  if (raw < 0) return 0;
  if (raw >= stops.length) return Math.max(0, stops.length - 1);
  return raw;
}

export function isOnLastRouteStop(job: MarketplaceJob): boolean {
  const stops = getJobRouteStops(job);
  return getActiveStopIndex(job) >= stops.length - 1;
}

export function getActiveRouteStop(job: MarketplaceJob): JobRouteStop {
  const stops = getJobRouteStops(job);
  return stops[getActiveStopIndex(job)] ?? stops[0];
}

export function getJobActiveDropoff(job: MarketplaceJob): LatLng {
  return getActiveRouteStop(job).coord;
}

export function getJobActiveDropoffAddress(job: MarketplaceJob): string {
  return getActiveRouteStop(job).address;
}

export function countCompletedRouteStops(job: MarketplaceJob): number {
  return getJobRouteStops(job).filter((s) => s.completedAt != null).length;
}
