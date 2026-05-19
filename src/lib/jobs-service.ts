import { getUserDisplayName, getUserPhone } from "./auth-users";
import { getAuthSession } from "./auth-session";
import { SERVICES } from "./services";
import { ERRAND_CATEGORIES } from "./errand-categories";
import type { MarketplaceJob, MarketplaceJobStatus } from "./jobs-types";
import type { TripRequest } from "./types";
import { canRunnerAcceptJobs } from "./runner-account";
import { isSupabaseConfigured } from "./supabase/config";
import { acceptJobRemote, fetchRemoteJobs, upsertRemoteJob } from "./supabase/jobs-remote";

const JOBS_STORAGE_KEY = "lr-marketplace-jobs-v1";
const JOBS_CHANNEL_NAME = "lr-marketplace-jobs-sync";
const RUNNER_DECLINED_JOBS_KEY = "lr-runner-declined-jobs-v1";

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

function persistJobsLocal(jobs: MarketplaceJob[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

function syncJobToRemote(job: MarketplaceJob): void {
  if (!isSupabaseConfigured()) return;
  void upsertRemoteJob(job);
}

async function syncJobToRemoteAwait(job: MarketplaceJob): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    await upsertRemoteJob(job);
    return true;
  } catch {
    return false;
  }
}

function writeJobs(jobs: MarketplaceJob[], options?: { skipRemote?: boolean }): void {
  persistJobsLocal(jobs);
  notifyListeners();
  if (!options?.skipRemote && isSupabaseConfigured()) {
    for (const job of jobs) syncJobToRemote(job);
  }
}

function insertJobLocal(job: MarketplaceJob): void {
  writeJobs([job, ...readJobs()], { skipRemote: true });
}

/** Replace in-memory store from remote pull (no upload). */
export function notifyJobsChanged(remoteJobs: MarketplaceJob[]): void {
  const local = readJobs();
  const map = new Map<string, MarketplaceJob>();
  for (const j of local) map.set(j.id, j);
  for (const j of remoteJobs) map.set(j.id, normalizeJob(j));
  writeJobs([...map.values()], { skipRemote: true });
}

function normalizeJob(job: MarketplaceJob): MarketplaceJob {
  const customerEmail = job.customerEmail ?? job.customerId;
  const businessEmail = job.businessEmail ?? job.businessId;
  return {
    ...job,
    customerEmail,
    runnerEmail: job.runnerEmail ?? job.runnerId,
    source: job.source ?? (businessEmail ? "business" : "customer"),
    businessEmail,
    businessId: job.businessId ?? businessEmail,
  };
}

export async function hydrateJobsFromRemote(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const remote = await fetchRemoteJobs();
  if (remote.length === 0) return;
  notifyJobsChanged(remote);
}

export function readJobs(): MarketplaceJob[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(JOBS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MarketplaceJob[];
    return Array.isArray(parsed) ? parsed.map(normalizeJob) : [];
  } catch {
    return [];
  }
}

function readDeclinedJobIds(runnerId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(RUNNER_DECLINED_JOBS_KEY);
  if (!raw) return new Set();
  try {
    const map = JSON.parse(raw) as Record<string, string[]>;
    return new Set(map[runnerId] ?? []);
  } catch {
    return new Set();
  }
}

function writeDeclinedJobIds(runnerId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(RUNNER_DECLINED_JOBS_KEY);
  let map: Record<string, string[]> = {};
  try {
    map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    map = {};
  }
  map[runnerId] = [...ids];
  window.localStorage.setItem(RUNNER_DECLINED_JOBS_KEY, JSON.stringify(map));
}

function patchJob(jobId: string, patch: Partial<MarketplaceJob>): MarketplaceJob | null {
  const jobs = readJobs();
  const index = jobs.findIndex((j) => j.id === jobId);
  if (index === -1) return null;
  const next = normalizeJob({ ...jobs[index], ...patch });
  jobs[index] = next;
  persistJobsLocal(jobs);
  notifyListeners();
  syncJobToRemote(next);
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

/** Pending jobs visible in the marketplace (not yet assigned). */
export function listPendingJobs(): MarketplaceJob[] {
  return readJobs()
    .filter((j) => j.status === "pending" && !j.runnerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Pending jobs a runner may respond to. Empty unless the runner is approved.
 * Skips jobs this runner declined locally (pass without accepting).
 */
export function listAvailableJobsForRunner(runnerId?: string | null): MarketplaceJob[] {
  if (!canRunnerAcceptJobs(runnerId ?? undefined)) return [];
  const declined = runnerId ? readDeclinedJobIds(runnerId) : new Set<string>();
  return listPendingJobs().filter((j) => !declined.has(j.id));
}

export function listJobsForCustomer(customerId: string): MarketplaceJob[] {
  return readJobs()
    .filter((j) => j.customerId === customerId || j.customerEmail === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listJobsForRunner(runnerId: string): MarketplaceJob[] {
  return readJobs()
    .filter((j) => j.runnerId === runnerId || j.runnerEmail === runnerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listCompletedJobsForCustomer(customerId: string): MarketplaceJob[] {
  return listJobsForCustomer(customerId).filter((j) => j.status === "completed");
}

export function getRunnerActiveJob(runnerId: string): MarketplaceJob | null {
  return (
    readJobs().find(
      (j) =>
        (j.runnerId === runnerId || j.runnerEmail === runnerId) &&
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

export async function createJobFromCustomerBooking(
  state: CreateJobBookingInput,
  customerId: string,
): Promise<{ job: MarketplaceJob | null; error?: string }> {
  const estimate = state.buildEstimate();
  const pickup = state.pickup!;
  const destination = state.destination!;
  const serviceType = state.selectedService!;
  const customerEmail = customerId;
  const customerName = getUserDisplayName(customerId) ?? customerId.split("@")[0] ?? "Customer";
  const customerPhone = getUserPhone(customerId) ?? undefined;

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
    customerId: customerEmail,
    customerEmail,
    customerName,
    customerPhone,
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

  insertJobLocal(job);

  const synced = await syncJobToRemoteAwait(job);
  if (!synced) {
    return {
      job: null,
      error: "Could not save your request to the server. Check your connection and try again.",
    };
  }

  return { job };
}

export async function acceptJob(
  jobId: string,
  runnerId: string,
  runnerName: string,
): Promise<MarketplaceJob | null> {
  if (!canRunnerAcceptJobs(runnerId)) return null;

  if (getRunnerActiveJob(runnerId)) return null;

  const runnerPhone = getUserPhone(runnerId) ?? undefined;
  const runnerEmail = runnerId;

  if (isSupabaseConfigured()) {
    const remote = await acceptJobRemote(jobId, runnerId, runnerName, runnerPhone);
    if (!remote) return null;
    const normalized = normalizeJob(remote);
    const jobs = readJobs();
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index === -1) {
      writeJobs([normalized, ...jobs], { skipRemote: true });
    } else {
      jobs[index] = normalized;
      writeJobs(jobs, { skipRemote: true });
    }
    return normalized;
  }

  const fresh = getJob(jobId);
  if (!fresh || fresh.status !== "pending" || fresh.runnerId) return null;

  return patchJob(jobId, {
    runnerId,
    runnerEmail,
    runnerName,
    runnerPhone,
    status: "accepted",
    acceptedAt: Date.now(),
  });
}

export function listActiveJobs(): MarketplaceJob[] {
  return readJobs().filter(
    (j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "declined",
  );
}

export function setJobProofPhoto(jobId: string, runnerId: string, proofPhotoUrl: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || (job.runnerId !== runnerId && job.runnerEmail !== runnerId)) return null;
  return patchJob(jobId, { proofPhotoUrl });
}

export function rateJobAsRunner(jobId: string, runnerId: string, runnerRating: number): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || (job.runnerId !== runnerId && job.runnerEmail !== runnerId) || job.status !== "completed") {
    return null;
  }
  return patchJob(jobId, { runnerRating });
}

/** Runner passes on a pending alert without accepting (job stays available for others). */
export function declineJob(jobId: string, runnerId: string): void {
  const job = getJob(jobId);
  if (!job || job.status !== "pending") return;
  const declined = readDeclinedJobIds(runnerId);
  declined.add(jobId);
  writeDeclinedJobIds(runnerId, declined);
  notifyListeners();
}

export function cancelJob(jobId: string, customerId: string): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || (job.customerId !== customerId && job.customerEmail !== customerId)) return null;
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
  if (!job || (job.runnerId !== runnerId && job.runnerEmail !== runnerId)) return null;

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

  if (actor.role === "customer" && job.customerId !== actor.id && job.customerEmail !== actor.id) {
    return null;
  }
  if (actor.role === "runner" && job.runnerId !== actor.id && job.runnerEmail !== actor.id) {
    return null;
  }

  return patchJob(jobId, {
    status,
    completedAt: status === "completed" ? Date.now() : job.completedAt,
  });
}

export function completeJobWithRating(jobId: string, customerId: string, rating: number): MarketplaceJob | null {
  const job = getJob(jobId);
  if (!job || (job.customerId !== customerId && job.customerEmail !== customerId)) return null;
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

export function getCurrentBusinessId(): string | null {
  const session = getAuthSession();
  if (!session || session.activeRole !== "business") return null;
  return session.email;
}

export function listJobsForBusiness(businessEmail: string): MarketplaceJob[] {
  return readJobs()
    .filter(
      (j) =>
        j.businessEmail === businessEmail ||
        j.businessId === businessEmail ||
        (j.source === "business" && j.customerEmail === businessEmail),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

export type BusinessJobCreateResult =
  | { ok: true; jobs: MarketplaceJob[] }
  | { ok: false; error: string };

/** Persist business-created jobs locally and to Supabase. */
export async function insertBusinessJobs(jobs: MarketplaceJob[]): Promise<BusinessJobCreateResult> {
  if (jobs.length === 0) {
    return { ok: false, error: "No jobs to create." };
  }

  const normalized = jobs.map(normalizeJob);
  writeJobs([...normalized, ...readJobs()], { skipRemote: true });

  for (const job of normalized) {
    const synced = await syncJobToRemoteAwait(job);
    if (!synced) {
      return { ok: false, error: "Could not save jobs to the server. Check your connection and try again." };
    }
  }

  return { ok: true, jobs: normalized };
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
