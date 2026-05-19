import {
  clearAuthSession,
  getAuthSession,
  getAuthenticatedRole,
  persistAuthSession,
  setAuthSession,
} from "./auth-session";
import {
  getRunnerOnboardingStatus,
  getStoredUser,
  migrateLegacyRunnerAccount,
  syncRunnerDeviceStateFromUser,
} from "./runner-account";
import { clearRunnerOnline } from "./runner-workflow";

const USERS_KEY = "lr-users-v1";

export type AppRole = "customer" | "runner" | "business" | "admin";
export type RunnerStage =
  | "service-selection"
  | "documents"
  | "vehicle"
  | "banking"
  | "training"
  | "verification"
  | "dashboard";

const ONBOARDED_KEY = "lr-onboarded";
const RUNNER_STAGE_KEY = "lr-runner-stage";
const RUNNER_ACCESS_KEY = "lr-runner-access";
const RUNNER_APPROVED_KEY = "lr-runner-approved";

function isRunnerStage(value: string | null): value is RunnerStage {
  return (
    value === "service-selection" ||
    value === "documents" ||
    value === "vehicle" ||
    value === "banking" ||
    value === "training" ||
    value === "verification" ||
    value === "dashboard"
  );
}

export function getStoredRole(): AppRole | null {
  return getAuthenticatedRole();
}

export function setStoredRole(role: AppRole): void {
  setAuthSession(role);
}

export function clearStoredRole(): void {
  clearAuthSession();
}

export function getStoredRunnerStage(): RunnerStage | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(RUNNER_STAGE_KEY);
  return isRunnerStage(value) ? value : null;
}

export function setStoredRunnerStage(stage: RunnerStage): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_STAGE_KEY, stage);
}

export function clearStoredRunnerStage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUNNER_STAGE_KEY);
}

export function hasRunnerAccess(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(RUNNER_ACCESS_KEY) === "true";
}

export function setRunnerAccess(access: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_ACCESS_KEY, access ? "true" : "false");
}

export function isRunnerApproved(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(RUNNER_APPROVED_KEY) === "true";
}

export function setRunnerApproved(approved: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_APPROVED_KEY, approved ? "true" : "false");
}

export function isCustomerOnboarded(): boolean {
  if (typeof window === "undefined") return false;

  const session = getAuthSession();
  if (!session) return false;

  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return false;

  try {
    const users = JSON.parse(raw) as { email: string; displayName?: string }[];
    const user = users.find((entry) => entry.email === session.email);
    if (user?.displayName?.trim()) return true;

    const legacyName = window.localStorage.getItem("lr-profile-name")?.trim();
    return Boolean(legacyName);
  } catch {
    return false;
  }
}

export function setCustomerOnboarded(onboarded: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDED_KEY, onboarded ? "true" : "false");
}

export function getRunnerOnboardingPath(stage = getStoredRunnerStage()): string {
  switch (stage) {
    case "documents":
      return "/runner/onboarding/documents";
    case "vehicle":
      return "/runner/onboarding/vehicle";
    case "banking":
      return "/runner/onboarding/banking";
    case "training":
      return "/runner/onboarding/training";
    case "verification":
      return "/runner/onboarding/verification";
    case "service-selection":
    default:
      return "/runner/service-selection";
  }
}

export function getRunnerHomePath(): string {
  const session = getAuthSession();
  if (session?.email) {
    migrateLegacyRunnerAccount(session.email);
  }

  const user = getStoredUser(session?.email);
  if (!user?.roles.includes("runner")) {
    return "/runner/service-selection";
  }

  const status = getRunnerOnboardingStatus(session?.email);

  switch (status) {
    case "not_started":
      return "/runner/service-selection";
    case "in_progress":
      return getRunnerOnboardingPath(user.runnerStage ?? getStoredRunnerStage() ?? "service-selection");
    case "pending_verification":
    case "rejected":
      return "/runner/onboarding/verification";
    case "approved":
      return "/runner/dashboard";
  }
}

export function hasRunnerConsoleAccess(_stage = getStoredRunnerStage()): boolean {
  return getRunnerOnboardingStatus() === "approved";
}

export function isRunnerFullyApproved(): boolean {
  return getRunnerOnboardingStatus() === "approved";
}

export function getRoleHomePath(role: AppRole): string {
  switch (role) {
    case "customer":
      return isCustomerOnboarded() ? "/customer/home" : "/customer/profile-setup";
    case "runner":
      return getRunnerHomePath();
    case "business":
      return "/business/dashboard";
    case "admin":
      return "/admin/overview";
  }
}

export function getPrototypeRoleHomePath(role: AppRole): string {
  switch (role) {
    case "customer":
      return "/customer/home";
    case "runner":
      return "/runner/dashboard";
    case "business":
      return "/business/dashboard";
    case "admin":
      return "/admin/overview";
  }
}

export function applyRoleSetup(role: AppRole): void {
  if (role !== "runner") return;
  const session = getAuthSession();
  if (!session?.email) return;
  migrateLegacyRunnerAccount(session.email);
  syncRunnerDeviceStateFromUser(getStoredUser(session.email));
}

export function bootstrapRoleForPrototype(role: AppRole): void {
  const session = getAuthSession();
  if (session) {
    persistAuthSession({ ...session, activeRole: role });
  } else {
    setAuthSession(role);
  }

  if (role === "customer" || role === "business") {
    setCustomerOnboarded(true);
  }

  if (role === "runner") {
    setRunnerAccess(true);
    setRunnerApproved(true);
    setStoredRunnerStage("dashboard");
  }
}

export function clearPrototypeRoleState(): void {
  setRunnerAccess(false);
  setRunnerApproved(false);
  clearStoredRunnerStage();
  clearRunnerOnline();
}
