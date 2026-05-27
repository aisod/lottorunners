import { getUserDisplayName, getUserPhone } from "./auth-users";
import { getAuthSession } from "./auth-session";
import { SERVICES } from "./services";
import type { CargoPhotoUrls } from "./cargo-photos";
import { ERRAND_CATEGORIES } from "./errand-categories";
import {
  getActiveStopIndex,
  getJobRouteStops,
  isMultiStopJob,
  isOnLastRouteStop,
} from "./job-route-stops";
import type { MarketplaceJob, MarketplaceJobStatus } from "./jobs-types";
import { mergeRemoteJobRows, remoteUpdatedMs } from "./jobs-merge";
import {
  countPendingHiddenByServiceFilter,
  filterPendingJobsForRunner,
  isJobUnassigned,
  runnerOfferedIdsToServiceTypes,
} from "./jobs-runner-feed";
import { useRunnerSettings } from "./runner-settings";
import type { ServiceType, TripRequest } from "./types";
import { canRunnerAcceptJobs } from "./runner-account";
import { isSupabaseConfigured } from "./supabase/config";
import {
  acceptJobRemote,
  fetchRemoteJobById,
  fetchRemoteJobs,
  upsertRemoteJob,
} from "./supabase/jobs-remote";
import {
  ensureSupabaseAuthSession as ensureSupabaseAuthSessionBool,
  isSupabaseAuthRateLimited,
  resetSupabaseAuthCache,
} from "./auth/ensure-session";
import { isUnauthorizedSupabaseError } from "./supabase/session";
import { getVerifiedRunnerId } from "./auth/get-verified-runner-id";
import { normalizeRunnerId } from "./supabase/session";

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
  void upsertRemoteJob(job).then((result) => {
    if (!result.ok) {
      if (result.error && isUnauthorizedSupabaseError({ message: result.error })) {
        resetSupabaseAuthCache();
      }
      console.warn("[jobs] remote sync failed:", result.error);
    }
  });
}

async function syncJobToRemoteAwait(job: MarketplaceJob): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const result = await upsertRemoteJob(job);
  if (!result.ok && result.error && isUnauthorizedSupabaseError({ message: result.error })) {
    resetSupabaseAuthCache();
  }
  return result.ok;
}

function removeJobLocal(jobId: string): void {
  writeJobs(
    readJobs().filter((j) => j.id !== jobId),
    { skipRemote: true },
  );
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

/** Replace in-memory store from remote pull (no upload); keep newer local row when ahead of server. */
export function notifyJobsChanged(remoteRows: import("./supabase/jobs-remote").RemoteJobRow[]): void {
  const local = readJobs();
  const merged = mergeRemoteJobRows(
    local,
    remoteRows.map(({ job, updatedAt }) => ({
      job: normalizeJob(job),
      updatedAt,
    })),
  );
  writeJobs(merged, { skipRemote: true });
}

export { remoteUpdatedMs, mergeRemoteJobRows };

function normalizeJob(job: MarketplaceJob): MarketplaceJob {
  const customerEmail = job.customerEmail ?? job.customerId;
  const businessEmail = job.businessEmail ?? job.businessId;
  const runnerId = job.runnerId?.trim() || undefined;
  const runnerEmail =
    job.runnerEmail?.trim() || (runnerId && job.status !== "pending" ? runnerId : undefined);
  return {
    ...job,
    customerEmail,
    runnerId,
    runnerEmail,
    source: job.source ?? (businessEmail ? "business" : "customer"),
    businessEmail,
    businessId: job.businessId ?? businessEmail,
  };
}

export async function hydrateJobsFromRemote(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  const result = await fetchRemoteJobs();
  if (!result.ok) return { ok: false, error: result.error };
  notifyJobsChanged(result.rows);
  return { ok: true };
}

/** Refresh a single active customer job from Supabase (runner accept, status changes). */
export async function syncCustomerJobFromRemote(
  jobId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const single = await fetchRemoteJobById(jobId);
  if (single.ok) {
    notifyJobsChanged([single.row]);
    return { ok: true };
  }

  const bulk = await hydrateJobsFromRemote();
  if (bulk.ok) return { ok: true };
  return { ok: false, error: single.error };
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

function applyJobPatchLocal(jobId: string, patch: Partial<MarketplaceJob>): MarketplaceJob | null {
  const jobs = readJobs();
  const index = jobs.findIndex((j) => j.id === jobId);
  if (index === -1) return null;
  const next = normalizeJob({
    ...jobs[index],
    ...patch,
    serverUpdatedAt: patch.serverUpdatedAt ?? jobs[index].serverUpdatedAt,
  });
  jobs[index] = next;
  persistJobsLocal(jobs);
  notifyListeners();
  return next;
}

function patchJob(jobId: string, patch: Partial<MarketplaceJob>): MarketplaceJob | null {
  const next = applyJobPatchLocal(jobId, patch);
  if (!next) return null;
  syncJobToRemote(next);
  return next;
}

async function patchJobAwait(jobId: string, patch: Partial<MarketplaceJob>): Promise<MarketplaceJob | null> {
  const next = applyJobPatchLocal(jobId, patch);
  if (!next) return null;
  if (isSupabaseConfigured()) {
    const synced = await syncJobToRemoteAwait(next);
    if (!synced) return null;
    return getJob(jobId);
  }
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
    .filter(isJobUnassigned)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Pending jobs excluded from this runner's feed because of offered-service settings. */
export function countRunnerHiddenPendingJobs(runnerId?: string | null): number {
  if (!canRunnerAcceptJobs(runnerId ?? undefined)) return 0;
  const offered = runnerOfferedIdsToServiceTypes(useRunnerSettings.getState().selectedServiceIds);
  const declined = runnerId ? readDeclinedJobIds(runnerId) : new Set<string>();
  return countPendingHiddenByServiceFilter(readJobs(), offered, declined);
}

/**
 * Pending jobs a runner may respond to. Empty unless the runner is approved.
 * Skips jobs this runner declined locally (pass without accepting).
 * Only includes jobs whose serviceType matches the runner's offered services.
 */
export function listAvailableJobsForRunner(runnerId?: string | null): MarketplaceJob[] {
  if (!canRunnerAcceptJobs(runnerId ?? undefined)) return [];
  const offered = runnerOfferedIdsToServiceTypes(useRunnerSettings.getState().selectedServiceIds);
  const declined = runnerId ? readDeclinedJobIds(runnerId) : new Set<string>();
  return filterPendingJobsForRunner(listPendingJobs(), offered, declined);
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
  cargoPhotos: CargoPhotoUrls;
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

  const cargoPhotoUrls =
    state.cargoPhotos && Object.values(state.cargoPhotos).some(Boolean)
      ? { ...state.cargoPhotos }
      : undefined;

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
    cargoPhotoUrls,
    createdAt: Date.now(),
  };

  insertJobLocal(job);

  const synced = await syncJobToRemoteAwait(job);
  if (!synced) {
    removeJobLocal(job.id);
    return {
      job: null,
      error: "Could not save your request to the server. Check your connection and try again.",
    };
  }

  const syncedJob = { ...job, serverUpdatedAt: Date.now() };
  patchJobLocalOnly(syncedJob);
  return { job: syncedJob };
}

function patchJobLocalOnly(job: MarketplaceJob): void {
  const jobs = readJobs();
  const index = jobs.findIndex((j) => j.id === job.id);
  if (index === -1) return;
  jobs[index] = normalizeJob(job);
  writeJobs(jobs, { skipRemote: true });
}

export type AcceptJobResult =
  | { ok: true; job: MarketplaceJob }
  | { ok: false; message: string };

export async function acceptJob(
  jobId: string,
  runnerId: string,
  runnerName: string,
): Promise<AcceptJobResult> {
  const runnerKey = isSupabaseConfigured()
    ? await getVerifiedRunnerId()
    : normalizeRunnerId(runnerId);

  if (!runnerKey) {
    return { ok: false, message: "Session expired. Please sign in again." };
  }

  if (!canRunnerAcceptJobs(runnerKey)) {
    return { ok: false, message: "Your runner profile must be approved before you can accept jobs." };
  }

  const active = getRunnerActiveJob(runnerKey);
  if (active) {
    return {
      ok: false,
      message: `You already have an active job (${active.id.slice(-8)}). Finish it before accepting another.`,
    };
  }

  const runnerPhone = getUserPhone(runnerKey) ?? undefined;
  const runnerEmail = runnerKey;

  if (isSupabaseConfigured()) {
    const authed = await ensureSupabaseAuthSessionBool();
    if (!authed) {
      return {
        ok: false,
        message: isSupabaseAuthRateLimited()
          ? "Too many requests. Wait a minute, then try accepting again."
          : "Session expired. Please sign in again.",
      };
    }

    const remote = await acceptJobRemote(jobId, runnerKey, runnerName, runnerPhone);
    if (!remote.ok) return { ok: false, message: remote.message };

    const normalized = normalizeJob({
      ...remote.job,
      serverUpdatedAt: Date.now(),
    });
    const jobs = readJobs();
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index === -1) {
      writeJobs([normalized, ...jobs], { skipRemote: true });
    } else {
      jobs[index] = normalized;
      writeJobs(jobs, { skipRemote: true });
    }
    return { ok: true, job: normalized };
  }

  const fresh = getJob(jobId);
  if (!fresh) {
    return { ok: false, message: "Job not found on this device." };
  }
  if (fresh.status !== "pending" || fresh.runnerId) {
    return {
      ok: false,
      message: "This job is no longer available. It may have been taken or cancelled.",
    };
  }

  const patched = patchJob(jobId, {
    runnerId: runnerKey,
    runnerEmail,
    runnerName,
    runnerPhone,
    status: "accepted",
    acceptedAt: Date.now(),
  });
  if (!patched) {
    return { ok: false, message: "Could not accept this job locally." };
  }
  return { ok: true, job: patched };
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

export async function cancelJob(jobId: string, customerId: string): Promise<MarketplaceJob | null> {
  const job = getJob(jobId);
  if (!job || (job.customerId !== customerId && job.customerEmail !== customerId)) return null;
  if (job.status !== "pending" && job.status !== "accepted") return null;
  return patchJobAwait(jobId, { status: "cancelled" });
}

const RUNNER_STATUS_FLOW: MarketplaceJobStatus[] = [
  "accepted",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
];

async function completeRunnerRouteStop(
  jobId: string,
  runnerId: string,
  job: MarketplaceJob,
): Promise<MarketplaceJob | null> {
  const stops = getJobRouteStops(job);
  const stopIdx = getActiveStopIndex(job);
  const updatedStops = stops.map((stop, i) =>
    i === stopIdx ? { ...stop, completedAt: Date.now() } : stop,
  );
  const nextIndex = stopIdx + 1;
  const nextStop = updatedStops[nextIndex];
  if (!nextStop) return null;

  const previous = { ...job, batchStops: stops, currentStopIndex: job.currentStopIndex };
  const patched = applyJobPatchLocal(jobId, {
    batchStops: updatedStops,
    currentStopIndex: nextIndex,
    dropoff: nextStop.coord,
    dropoffAddress: nextStop.address,
    status: "en_route",
  });
  if (!patched) return null;

  if (isSupabaseConfigured()) {
    const synced = await syncJobToRemoteAwait(patched);
    if (!synced) {
      applyJobPatchLocal(jobId, {
        status: previous.status,
        batchStops: previous.batchStops,
        currentStopIndex: previous.currentStopIndex,
        dropoff: previous.dropoff,
        dropoffAddress: previous.dropoffAddress,
      });
      return null;
    }
    return getJob(jobId);
  }

  return patched;
}

export async function advanceRunnerJobStatus(
  jobId: string,
  runnerId: string,
): Promise<MarketplaceJob | null> {
  const job = getJob(jobId);
  if (!job || (job.runnerId !== runnerId && job.runnerEmail !== runnerId)) return null;

  const idx = RUNNER_STATUS_FLOW.indexOf(job.status);
  if (idx === -1 || idx >= RUNNER_STATUS_FLOW.length - 1) return job;

  const nextStatus = RUNNER_STATUS_FLOW[idx + 1];

  if (nextStatus === "completed" && isMultiStopJob(job) && !isOnLastRouteStop(job)) {
    return completeRunnerRouteStop(jobId, runnerId, job);
  }

  const previous = { ...job };
  const statusPatch: Partial<MarketplaceJob> = {
    status: nextStatus,
    completedAt: nextStatus === "completed" ? Date.now() : job.completedAt,
  };
  if (nextStatus === "completed" && job.batchStops?.length) {
    const stopIdx = getActiveStopIndex(job);
    statusPatch.batchStops = getJobRouteStops(job).map((stop, i) =>
      i === stopIdx ? { ...stop, completedAt: Date.now() } : stop,
    );
  }

  const patched = applyJobPatchLocal(jobId, statusPatch);
  if (!patched) return null;

  if (isSupabaseConfigured()) {
    const synced = await syncJobToRemoteAwait(patched);
    if (!synced) {
      applyJobPatchLocal(jobId, {
        status: previous.status,
        completedAt: previous.completedAt,
        batchStops: previous.batchStops,
        runnerId: previous.runnerId,
        runnerEmail: previous.runnerEmail,
        runnerName: previous.runnerName,
        runnerPhone: previous.runnerPhone,
      });
      return null;
    }
    return getJob(jobId);
  }

  return patched;
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
  const key = businessEmail.trim().toLowerCase();
  return readJobs()
    .filter((j) => {
      const businessKey = (j.businessEmail ?? j.businessId ?? "").trim().toLowerCase();
      const customerKey = (j.customerEmail ?? j.customerId ?? "").trim().toLowerCase();
      return businessKey === key || (j.source === "business" && customerKey === key);
    })
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
  const previous = readJobs();

  const syncedJobs: MarketplaceJob[] = [];
  for (const job of normalized) {
    const synced = await syncJobToRemoteAwait(job);
    if (!synced) {
      writeJobs(previous, { skipRemote: true });
      return { ok: false, error: "Could not save jobs to the server. Check your connection and try again." };
    }
    syncedJobs.push({ ...job, serverUpdatedAt: Date.now() });
  }

  const merged = [...syncedJobs, ...previous];
  writeJobs(merged, { skipRemote: true });

  return { ok: true, jobs: syncedJobs };
}

export function getCurrentRunnerId(): string | null {
  const session = getAuthSession();
  if (!session || session.activeRole !== "runner") return null;
  return normalizeRunnerId(session.email);
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
