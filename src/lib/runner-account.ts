import { syncCurrentUserProfileToRemote } from "./auth-users";
import { getAuthSession } from "./auth-session";
import type { RunnerStage } from "./store";
import {
  setRunnerAccess,
  setRunnerApproved,
  setStoredRunnerStage,
} from "./store";
import { isSupabaseConfigured } from "./supabase/config";
import {
  fetchProfileByEmail,
  updateRemoteRunnerStatus,
} from "./supabase/profiles-remote";
function clearRunnerOnlineLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("lr-runner-online-v1");
}

const USERS_KEY = "lr-users-v1";

export type RunnerOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "pending_verification"
  | "approved"
  | "rejected";

export type StoredUserWithRunner = {
  email: string;
  password: string;
  roles: string[];
  displayName?: string;
  supabaseId?: string;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

export type RunnerModerationResult = { ok: true } | { ok: false; error: string };

function readUsers(): StoredUserWithRunner[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredUserWithRunner[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUserWithRunner[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getStoredUser(email?: string): StoredUserWithRunner | null {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) return null;
  return readUsers().find((entry) => entry.email === sessionEmail) ?? null;
}

function inferLegacyRunnerStatus(user: StoredUserWithRunner): RunnerOnboardingStatus {
  if (user.runnerStatus) return user.runnerStatus;
  if (typeof window === "undefined") return "not_started";

  if (window.localStorage.getItem("lr-runner-approved") === "true") return "approved";
  const stage = window.localStorage.getItem("lr-runner-stage");
  if (stage === "verification" || stage === "dashboard") return "pending_verification";
  if (stage && stage !== "service-selection") return "in_progress";
  return "not_started";
}

export function getRunnerOnboardingStatus(email?: string): RunnerOnboardingStatus {
  const user = getStoredUser(email);
  if (!user?.roles.includes("runner")) return "not_started";
  return inferLegacyRunnerStatus(user);
}

export function isRunnerFullyApproved(email?: string): boolean {
  return getRunnerOnboardingStatus(email) === "approved";
}

export function canRunnerAcceptJobs(email?: string): boolean {
  return isRunnerFullyApproved(email);
}

function patchRunnerUser(
  email: string,
  patch: Partial<Pick<StoredUserWithRunner, "runnerStatus" | "runnerStage" | "supabaseId">>,
): StoredUserWithRunner | null {
  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === email);
  if (index === -1) return null;

  users[index] = { ...users[index], ...patch };
  writeUsers(users);
  return users[index];
}

/** Mirror account runner state into localStorage flags used by route guards. */
export function syncRunnerDeviceStateFromUser(user: StoredUserWithRunner | null): void {
  if (!user?.roles.includes("runner")) return;

  const status = inferLegacyRunnerStatus(user);
  setRunnerAccess(true);

  if (status === "approved") {
    setRunnerApproved(true);
    setStoredRunnerStage(user.runnerStage ?? "dashboard");
    return;
  }

  setRunnerApproved(false);
  clearRunnerOnlineLocal();

  if (status === "pending_verification" || status === "rejected") {
    setStoredRunnerStage("verification");
    return;
  }

  if (status === "in_progress" && user.runnerStage) {
    setStoredRunnerStage(user.runnerStage);
    return;
  }

  if (status === "not_started") {
    setStoredRunnerStage("service-selection");
  }
}

export function persistRunnerOnboardingStage(stage: RunnerStage): void {
  const session = getAuthSession();
  if (!session) return;

  const current = getStoredUser(session.email);
  const status =
    current?.runnerStatus === "not_started" || !current?.runnerStatus
      ? "in_progress"
      : current.runnerStatus === "approved" ||
          current.runnerStatus === "pending_verification" ||
          current.runnerStatus === "rejected"
        ? current.runnerStatus
        : "in_progress";

  patchRunnerUser(session.email, { runnerStatus: status, runnerStage: stage });
  setRunnerAccess(true);
  setStoredRunnerStage(stage);
}

async function persistRunnerStatusForEmail(
  email: string,
  runnerStatus: RunnerOnboardingStatus,
  runnerStage: RunnerStage,
): Promise<RunnerModerationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  let user = getStoredUser(normalizedEmail);

  if (isSupabaseConfigured()) {
    const profile = await fetchProfileByEmail(normalizedEmail);
    if (!profile) {
      return { ok: false, error: "Runner profile not found in Supabase." };
    }

    const saved = await updateRemoteRunnerStatus(profile.id, runnerStatus);
    if (!saved) {
      return { ok: false, error: "Could not update runner status in Supabase." };
    }

    user = patchRunnerUser(normalizedEmail, {
      runnerStatus,
      runnerStage,
      supabaseId: profile.id,
    });
  } else {
    user = patchRunnerUser(normalizedEmail, { runnerStatus, runnerStage });
  }

  if (!user) {
    return { ok: false, error: "Runner account not found on this device." };
  }

  syncRunnerDeviceStateFromUser(user);

  const session = getAuthSession();
  if (session?.email === normalizedEmail) {
    void syncCurrentUserProfileToRemote({
      runnerStatus: user.runnerStatus,
      runnerStage: user.runnerStage,
    });
  }

  return { ok: true };
}

/** Runner finished onboarding — awaits admin review (production path). */
export async function submitRunnerForVerification(email?: string): Promise<RunnerModerationResult> {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) {
    return { ok: false, error: "You must be signed in as a runner." };
  }

  return persistRunnerStatusForEmail(sessionEmail, "pending_verification", "verification");
}

/** Admin approves a runner — updates Supabase profile for the target user. */
export async function approveRunnerAccount(email: string): Promise<RunnerModerationResult> {
  return persistRunnerStatusForEmail(email, "approved", "dashboard");
}

/** Admin rejects a runner application — updates Supabase profile for the target user. */
export async function rejectRunnerAccount(email: string): Promise<RunnerModerationResult> {
  return persistRunnerStatusForEmail(email, "rejected", "verification");
}

/** @deprecated Use submitRunnerForVerification instead. */
export function completeRunnerOnboardingPending(): void {
  void submitRunnerForVerification();
}

export function migrateLegacyRunnerAccount(email: string): void {
  const user = getStoredUser(email);
  if (!user?.roles.includes("runner") || user.runnerStatus) return;

  const status = inferLegacyRunnerStatus(user);
  const stage =
    user.runnerStage ??
    ((typeof window !== "undefined"
      ? window.localStorage.getItem("lr-runner-stage")
      : null) as RunnerStage | null) ??
    (status === "pending_verification" || status === "approved" || status === "rejected"
      ? "verification"
      : "service-selection");

  patchRunnerUser(email, { runnerStatus: status, runnerStage: stage });
}
