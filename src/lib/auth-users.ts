import {
  createAuthSession,
  getAuthSession,
  persistAuthSession,
  type PublicRole,
} from "./auth-session";
import type { RunnerOnboardingStatus } from "./runner-account";
import { migrateLegacyRunnerAccount, syncRunnerDeviceStateFromUser } from "./runner-account";
import { applyRoleSetup, getRoleHomePath, setRunnerAccess, setRunnerApproved, type RunnerStage } from "./store";

const USERS_KEY = "lr-users-v1";
const PREFERRED_ROLE_KEY = "lr-preferred-role-v1";

export type StoredUser = {
  email: string;
  password: string;
  roles: PublicRole[];
  /** Role chosen at signup; used when signing in with multiple roles. */
  primaryRole?: PublicRole;
  displayName?: string;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

export type AuthResult =
  | { ok: true; homePath: string }
  | { ok: false; error: string };

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildRoles(wantRunner: boolean, wantBusiness: boolean): PublicRole[] {
  const roles: PublicRole[] = ["customer"];
  if (wantRunner) roles.push("runner");
  if (wantBusiness) roles.push("business");
  return roles;
}

function inferPrimaryRole(user: StoredUser): PublicRole | null {
  if (user.primaryRole && user.roles.includes(user.primaryRole)) {
    return user.primaryRole;
  }
  if (
    user.roles.includes("runner") &&
    user.runnerStatus &&
    user.runnerStatus !== "not_started"
  ) {
    return "runner";
  }
  return null;
}

function migrateUserRecord(user: StoredUser): StoredUser {
  if (user.primaryRole && user.roles.includes(user.primaryRole)) {
    return user;
  }

  let primaryRole: PublicRole | undefined;
  if (
    user.roles.includes("runner") &&
    user.runnerStatus &&
    user.runnerStatus !== "not_started"
  ) {
    primaryRole = "runner";
  } else if (user.roles.includes("business")) {
    primaryRole = "business";
  } else if (user.roles.length === 1) {
    primaryRole = user.roles[0];
  } else if (user.roles.includes("runner") && user.roles.includes("customer")) {
    primaryRole = "runner";
  }

  if (!primaryRole) return user;
  return { ...user, primaryRole };
}

function getStoredPreferredRole(): PublicRole | null {
  if (typeof window === "undefined") return null;
  const preferred = window.localStorage.getItem(PREFERRED_ROLE_KEY);
  if (preferred === "customer" || preferred === "runner" || preferred === "business") {
    return preferred;
  }
  return null;
}

function getLoginActiveRole(user: StoredUser): PublicRole {
  const { roles } = user;

  // Account signup role wins over browser preference so each email lands on its portal.
  const primary = inferPrimaryRole(user);
  if (primary) return primary;

  const preferred = getStoredPreferredRole();
  if (preferred && roles.includes(preferred)) return preferred;

  if (roles.includes("business")) return "business";
  if (roles.includes("runner")) return "runner";
  if (roles.includes("customer")) return "customer";
  return roles[0] ?? "customer";
}

function rememberActiveRole(role: PublicRole): void {
  if (typeof window === "undefined") return;
  if (role === "customer" || role === "runner" || role === "business") {
    window.localStorage.setItem(PREFERRED_ROLE_KEY, role);
  }
}

export function registerUser(input: {
  email: string;
  password: string;
  confirmPassword: string;
  wantRunner: boolean;
  wantBusiness: boolean;
}): AuthResult {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const roles = buildRoles(input.wantRunner, input.wantBusiness);
  const primaryRole: PublicRole = input.wantRunner
    ? "runner"
    : input.wantBusiness
      ? "business"
      : "customer";
  const newUser: StoredUser = { email, password, roles, primaryRole };
  if (input.wantRunner) {
    newUser.runnerStatus = "in_progress";
    newUser.runnerStage = "service-selection";
    if (typeof window !== "undefined") {
      setRunnerAccess(true);
      setRunnerApproved(false);
    }
  }
  users.push(newUser);
  writeUsers(users);

  const session = createAuthSession({ email, roles, activeRole: primaryRole });
  persistAuthSession(session);
  rememberActiveRole(primaryRole);
  applyRoleSetup(primaryRole);
  syncProfileCacheForUser(newUser);
  if (input.wantRunner) {
    syncRunnerDeviceStateFromUser(newUser);
  }

  return { ok: true, homePath: getRoleHomePath(primaryRole) };
}

function syncProfileCacheForUser(user: StoredUser): void {
  if (typeof window === "undefined") return;

  if (user.displayName?.trim()) {
    window.localStorage.setItem("lr-profile-name", user.displayName.trim());
    return;
  }

  const legacyName = window.localStorage.getItem("lr-profile-name")?.trim();
  if (!legacyName) return;

  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === user.email);
  if (index === -1) return;

  users[index] = { ...users[index], displayName: legacyName };
  writeUsers(users);
}

export function loginUser(input: { email: string; password: string }): AuthResult {
  const email = normalizeEmail(input.email);
  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === email);
  const found = index === -1 ? null : users[index];

  if (!found || found.password !== input.password) {
    return { ok: false, error: "Invalid email or password." };
  }

  const user = migrateUserRecord(found);
  if (user !== found) {
    users[index] = user;
    writeUsers(users);
  }

  const activeRole = getLoginActiveRole(user);

  const session = createAuthSession({
    email: user.email,
    roles: user.roles,
    activeRole,
  });
  persistAuthSession(session);
  rememberActiveRole(activeRole);
  if (user.roles.includes("runner")) {
    migrateLegacyRunnerAccount(user.email);
  }
  applyRoleSetup(activeRole);
  syncProfileCacheForUser(user);

  return { ok: true, homePath: getRoleHomePath(activeRole) };
}

export function switchAccountRole(role: PublicRole): AuthResult {
  const session = getAuthSession();
  if (!session) {
    return { ok: false, error: "You are not signed in." };
  }

  const users = readUsers();
  const user = users.find((entry) => entry.email === session.email);
  if (!user?.roles.includes(role)) {
    return { ok: false, error: "This account does not have access to that role." };
  }

  const nextSession = createAuthSession({
    email: user.email,
    roles: user.roles,
    activeRole: role,
  });
  persistAuthSession(nextSession);
  rememberActiveRole(role);
  if (user.roles.includes("runner")) {
    migrateLegacyRunnerAccount(user.email);
  }
  applyRoleSetup(role);
  syncProfileCacheForUser(user);

  return { ok: true, homePath: getRoleHomePath(role) };
}

export function getUserDisplayName(email?: string): string | null {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) return null;

  const user = readUsers().find((entry) => entry.email === sessionEmail);
  const name = user?.displayName?.trim();
  return name || null;
}

export function updateUserDisplayName(displayName: string): boolean {
  const session = getAuthSession();
  if (!session) return false;

  const trimmed = displayName.trim();
  if (!trimmed) return false;

  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === session.email);
  if (index === -1) return false;

  users[index] = { ...users[index], displayName: trimmed };
  writeUsers(users);

  if (typeof window !== "undefined") {
    window.localStorage.setItem("lr-profile-name", trimmed);
  }

  return true;
}

export function hasCustomerProfile(email?: string): boolean {
  return Boolean(getUserDisplayName(email));
}
