import { syncCurrentUserProfileToRemote } from "./auth-users";
import { getAuthSession } from "./auth-session";
import type { RunnerStage } from "./store";
import {
  setRunnerAccess,
  setRunnerApproved,
  setStoredRunnerStage,
} from "./store";

const USERS_KEY = "lr-users-v1";

export type RunnerOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "pending_verification"
  | "approved";

export type StoredUserWithRunner = {
  email: string;
  password: string;
  roles: string[];
  displayName?: string;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

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

function patchRunnerUser(
  email: string,
  patch: Partial<Pick<StoredUserWithRunner, "runnerStatus" | "runnerStage">>,
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

  if (status === "pending_verification") {
    setStoredRunnerStage("dashboard");
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
      : current.runnerStatus === "approved" || current.runnerStatus === "pending_verification"
        ? current.runnerStatus
        : "in_progress";

  patchRunnerUser(session.email, { runnerStatus: status, runnerStage: stage });
  setRunnerAccess(true);
  setStoredRunnerStage(stage);
}

/** Demo / prototype: mark runner approved and sync device flags for job acceptance. */
export function approveRunnerAccount(email?: string): void {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) return;

  const user = patchRunnerUser(sessionEmail, {
    runnerStatus: "approved",
    runnerStage: "dashboard",
  });
  if (!user) return;

  syncRunnerDeviceStateFromUser(user);
  void syncCurrentUserProfileToRemote({
    runnerStatus: user.runnerStatus,
    runnerStage: user.runnerStage,
  });
}

/** Called when onboarding is finished (verification → home). Auto-approves for demo. */
export function completeRunnerOnboardingPending(): void {
  approveRunnerAccount();
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
    (status === "pending_verification" || status === "approved" ? "dashboard" : "service-selection");

  patchRunnerUser(email, { runnerStatus: status, runnerStage: stage });
}
