import type { BusinessBulkDraft } from "./business-bulk-draft";
import { getUserDisplayName, getUserPhone } from "./auth-users";
import { geocodeRouteStop, isValidRouteStop } from "./geocode-address";
import {
  getCurrentBusinessId,
  insertBusinessJobs,
  listJobsForBusiness,
  type BusinessJobCreateResult,
} from "./jobs-service";
import { SERVICES } from "./services";
import type { MarketplaceJob } from "./jobs-types";
import type { LatLng, ServiceType } from "./types";

export { getCurrentBusinessId, listJobsForBusiness };

export type BusinessBulkSubmitResult =
  | { ok: true; jobs: MarketplaceJob[]; batchId: string }
  | { ok: false; error: string; partial?: MarketplaceJob[] };

export function businessJobActivityTitle(job: MarketplaceJob): string {
  const service = SERVICES[job.serviceType]?.label ?? "Delivery";
  if (job.batchName && job.batchStopIndex != null) {
    return `${service} · ${job.batchName} (stop ${job.batchStopIndex + 1})`;
  }
  return `${service} · ${job.dropoffAddress}`;
}

export async function createJobsFromBusinessBulk(
  draft: BusinessBulkDraft,
  businessEmail: string,
): Promise<BusinessBulkSubmitResult> {
  const businessName = getUserDisplayName(businessEmail) ?? businessEmail.split("@")[0] ?? "Business";
  const businessPhone = getUserPhone(businessEmail) ?? undefined;
  const serviceType = draft.serviceType ?? "delivery";
  const pickupText = draft.pickupAddress?.trim() ?? "";

  if (!pickupText) {
    return { ok: false, error: "Enter a pickup / dispatch origin address for this batch." };
  }

  const validStops = draft.stops.filter((s) => s.address.trim().length >= 3);
  if (validStops.length === 0) {
    return { ok: false, error: "Add at least one stop with a full address (3+ characters)." };
  }

  const pickupStop = await geocodeRouteStop(pickupText, null);
  if (!isValidRouteStop(pickupStop)) {
    return {
      ok: false,
      error: "Could not locate the pickup address. Pick a search result or refine the address.",
    };
  }

  const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created: MarketplaceJob[] = [];
  const errors: string[] = [];

  for (let i = 0; i < validStops.length; i++) {
    const stop = validStops[i];
    const destStop = await geocodeRouteStop(stop.address.trim(), pickupStop!.coord);
    if (!isValidRouteStop(destStop)) {
      errors.push(`Stop ${i + 1}: could not geocode "${stop.address}".`);
      continue;
    }

    const distanceKm = haversineKm(pickupStop!.coord, destStop.coord);
    const base = SERVICES[serviceType].baseFare;
    const fare = Math.round(base + SERVICES[serviceType].perKm * Math.max(distanceKm, 0.5));

    const job: MarketplaceJob = {
      id: `job-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      source: "business",
      businessId: businessEmail,
      businessEmail,
      businessName,
      batchId,
      batchName: draft.batchName.trim() || "Business batch",
      batchStopIndex: i,
      customerId: businessEmail,
      customerEmail: businessEmail,
      customerName: businessName,
      customerPhone: businessPhone,
      serviceType,
      pickupAddress: pickupStop!.label,
      pickup: pickupStop!.coord,
      dropoffAddress: destStop.label,
      dropoff: destStop.coord,
      description: stop.notes.trim() || `Business dispatch · ${draft.batchName}`,
      estimatedFare: fare,
      distanceKm,
      etaMin: SERVICES[serviceType].etaMin + Math.round(distanceKm * 2),
      paymentMethod: "wallet",
      status: "pending",
      scheduleMode: "now",
      createdAt: Date.now(),
    };

    created.push(job);
  }

  if (created.length === 0) {
    return {
      ok: false,
      error: errors[0] ?? "No jobs could be created. Check addresses and try again.",
    };
  }

  const persist = await insertBusinessJobs(created);
  if (!persist.ok) {
    return { ok: false, error: persist.error ?? "Failed to save jobs to the server.", partial: created };
  }

  if (errors.length > 0) {
    return {
      ok: true,
      jobs: persist.jobs,
      batchId,
    };
  }

  return { ok: true, jobs: persist.jobs, batchId };
}

function haversineKm(a: LatLng, b: LatLng): number {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
