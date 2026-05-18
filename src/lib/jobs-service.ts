import { getUserDisplayName } from "./auth-users";
import { getAuthSession } from "./auth-session";
import { SERVICES } from "./services";
import { ERRAND_CATEGORIES } from "./errand-categories";
import type { MarketplaceJob, MarketplaceJobStatus } from "./jobs-types";
import type { TripRequest } from "./types";

const JOBS_STORAGE_KEY = "lr-marketplace-jobs-v1";
const JOBS_CHANNEL_NAME = "lr-marketplace-jobs-sync";

type JobsListener = (jobs: MarketplaceJob[]) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<JobsListener>();

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(JOBS_CHANNEL_NAME);
    channel.onmessage = () => {
      const jobs = readJobs();
      listeners.forEach((fn) => fn(jobs));
    };
  }
  return channel;
}

function notifyListeners(): void {
  const jobs = readJobs();
  listeners.forEach((fn) => fn(jobs));
  getChannel()?.postMessage({ type: "jobs-updated", at: Date.now() });
}

export function readJobs(): MarketplaceJob[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(JOBS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MarketplaceJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: MarketplaceJob[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  notifyListeners();
}

function patchJob(jobId: string, patch: Partial<MarketplaceJob>): MarketplaceJob | null {
  const jobs = readJobs();
  const index = jobs.findIndex((j) => j.id === jobId);
  if (index === -1) return null;
  const next = { ...jobs[index], ...patch };
  jobs[index] = next;
  writeJobs(jobs);
  return next;
}

export function subscribeToJobs(listener: JobsListener): () => void {
  listeners.add(listener);
  getChannel();
  listener(readJobs());
  return () => listeners.delete(listener);
}

export function getJob(jobId: string): MarketplaceJob | null {
  return readJobs().find((j) => j.id === jobId) ?? null;
}

export function listPendingJobs(): MarketplaceJob[] {
  return readJobs()
    .filter((j) => j.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listJobsForCustomer(customerId: string): MarketplaceJob[] {
  return readJobs()
    .filter((j) => j.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listCompletedJobsForCustomer(customerId: string): MarketplaceJob[] {
  return listJobsForCustomer(customerId).filter((j) => j.status === "completed");
}

export function getRunnerActiveJob(runnerId: string): MarketplaceJob | null {
  return (
    readJobs().find(
      (j) =>
        j.runnerId === runnerId &&
        j.status !== "pending" &&
        j.status !== "completed" &&
        j.status !== "cancelled" &&
        j.status !== "declined",
    ) ?? null
  );
}

export type CreateJobBookingInput = {
  selectedService: import("./types").ServiceType;
  pickup: { coord: import("./types").LatLng; label: string };
  destination: { coord: import("./types").LatLng; label: string };
  errandDescription: string;
  errandCategory: import("./errand-categories").ErrandCategoryId | null;
  storePreference: string;
  basketValue: number;
  durationMin: number;
  truckSizeId: import("./types").TruckSizeId | null;
  movingNotes: string;
  paymentMethod: import("./types").PaymentMethod;
  scheduleMode: import("./types").ScheduleMode;
  scheduledAt: number | null;
  rideSubType: string | null;
  buildEstimate: () => {
    fare: number;
    distanceKm: number;
    etaMin: number;
  } | null;
};

export function createJobFromCustomerBooking(
  state: CreateJobBookingInput,
  customerId: string,
): MarketplaceJob {
  const estimate = state.buildEstimate();
  const pickup = state.pickup!;
  const destination = state.destination!;
  const serviceType = state.selectedService!;
  const customerName = getUserDisplayName(customerId) ?? customerId.split("@")[0] ?? "Customer";

  let subType = state.rideSubType ?? undefined;
  if (serviceType === "errand" && state.errandCategory) {
    subType = state.errandCategory;
  }
  if (serviceType === "truck" && state.truckSizeId) {
    subType = state.truckSizeId;
  }

  const serviceLabel = SERVICES[serviceType].label;
  const errandLabel =
    state.errandCategory && ERRAND_CATEGORIES[state.errandCategory]
      ? ERRAND_CATEGORIES[state.errandCategory].label
      : null;

  const descriptionParts = [
    state.errandDescription?.trim(),
    state.storePreference?.trim() ? `Store: ${state.storePreference.trim()}` : "",
    state.movingNotes?.trim(),
  ].filter(Boolean);

  const job: MarketplaceJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId,
    customerName,
    serviceType,
    subType,
    pickupAddress: pickup.label,
    pickup: pickup.coord,
    dropoffAddress: destination.label,
    dropoff: destination.coord,
    description: descriptionParts.join(" · ") || `${serviceLabel}${errandLabel ? ` — ${errandLabel}` : ""}`,
    estimatedFare: estimate?.fare ?? SERVICES[serviceType].baseFare,
    distanceKm: estimate?.distanceKm ?? 0,
    etaMin: estimate?.etaMin ?? SERVICES[serviceType].etaMin,
    paymentMethod: state.paymentMethod,
    status: "pending",
    scheduleMode: state.scheduleMode,
    scheduledAt: state.scheduledAt ?? undefined,
    basketValue: state.basketValue || undefined,
    durationMin: state.durationMin,
    errandCategory: state.errandCategory ?? undefined,
    createdAt: Date.now(),
  };

  writeJobs([job, ...readJobs()]);
  return job;
}

export function acceptJob(jobId: string, runnerId: string, runnerName: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || job.status !== "pending") return null;
  if (getRunnerActiveJob(runnerId)) return null;

  return patchJob(jobId, {
    runnerId,
    runnerName,
    status: "accepted",
    acceptedAt: Date.now(),
  });
}

export function declineJob(jobId: string, runnerId: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || job.status !== "pending") return null;
  // Runner declines this offer; job stays pending for other runners.
  void runnerId;
  return job;
}

export function cancelJob(jobId: string, customerId: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || job.customerId !== customerId) return null;
  if (job.status !== "pending" && job.status !== "accepted") return null;
  return patchJob(jobId, { status: "cancelled" });
}

const RUNNER_STATUS_FLOW: MarketplaceJobStatus[] = [
  "accepted",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
];

export function advanceRunnerJobStatus(jobId: string, runnerId: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || job.runnerId !== runnerId) return null;

  const idx = RUNNER_STATUS_FLOW.indexOf(job.status);
  if (idx === -1 || idx >= RUNNER_STATUS_FLOW.length - 1) return job;

  const next = RUNNER_STATUS_FLOW[idx + 1];
  return patchJob(jobId, {
    status: next,
    completedAt: next === "completed" ? Date.now() : job.completedAt,
  });
}

export function setJobStatus(
  jobId: string,
  status: MarketplaceJobStatus,
  actor: { role: "customer" | "runner"; id: string },
): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job) return null;

  if (actor.role === "customer" && job.customerId !== actor.id) return null;
  if (actor.role === "runner" && job.runnerId !== actor.id) return null;

  return patchJob(jobId, {
    status,
    completedAt: status === "completed" ? Date.now() : job.completedAt,
  });
}

export function completeJobWithRating(jobId: string, customerId: string, rating: number): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || job.customerId !== customerId) return null;
  return patchJob(jobId, {
    status: "completed",
    rating,
    completedAt: Date.now(),
  });
}

export function jobToTripRequest(job: MarketplaceJob): TripRequest {
  return {
    id: job.id,
    service: job.serviceType,
    pickup: job.pickup,
    pickupLabel: job.pickupAddress,
    destination: job.dropoff,
    destinationLabel: job.dropoffAddress,
    errandDescription: job.description,
    errandCategory: job.errandCategory,
    basketValue: job.basketValue,
    durationMin: job.durationMin,
    fare: job.estimatedFare,
    distanceKm: job.distanceKm,
    etaMin: job.etaMin,
    payment: job.paymentMethod,
    status: "rated",
    rating: job.rating,
    createdAt: job.createdAt,
    scheduledAt: job.scheduledAt,
  };
}

export function getCurrentCustomerId(): string | null {
  return getAuthSession()?.email ?? null;
}

export function getCurrentRunnerId(): string | null {
  const session = getAuthSession();
  if (!session || session.activeRole !== "runner") return null;
  return session.email;
}

export function jobStatusLabel(status: MarketplaceJobStatus): string {
  switch (status) {
    case "pending":
      return "Waiting for runner";
    case "declined":
      return "Declined";
    case "accepted":
      return "Runner accepted";
    case "en_route":
      return "Runner en route";
    case "arrived":
      return "Runner arrived";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
