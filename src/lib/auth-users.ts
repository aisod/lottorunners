import {
  accountHasAdminRole,
  clearAuthSession,
  createAuthSession,
  getAuthSession,
  persistAuthSession,
  type AccountRole,
  type PublicRole,
} from "./auth-session";
import type { AppRole } from "./store";
import type { RunnerOnboardingStatus } from "./runner-account";
import {
  migrateLegacyRunnerAccount,
  notifyRunnerAccountChanged,
  syncRunnerDeviceStateFromUser,
} from "./runner-account";
import { isValidPhone, normalizePhone } from "./phone-utils";
import { requestPasswordResetServer } from "./auth/request-password-reset.server";
import { resetSupabaseAuthCache } from "./auth/ensure-session";
import { isLocalDevAuthAllowed, isSupabaseConfigured } from "./supabase/config";
import { getSupabaseClient } from "./supabase/client";
import {
  fetchProfileByEmail,
  fetchProfileByUserId,
  ensureBootstrapAdmin,
  rowToStoredShape,
  signInRemote,
  requestPasswordResetRemote,
  signOutRemote,
  signUpRemote,
  updatePasswordRemote,
  upsertRemoteProfile,
} from "./supabase/profiles-remote";
import { applyRoleSetup, getRoleHomePath, setRunnerAccess, setRunnerApproved, type RunnerStage } from "./store";

const USERS_KEY = "lr-users-v1";
const PREFERRED_ROLE_KEY = "lr-preferred-role-v1";
const PROFILE_PHONE_KEY = "lr-profile-phone";

export type StoredUser = {
  email: string;
  password: string;
  roles: AccountRole[];
  /** Role chosen at signup; used when signing in with multiple roles. */
  primaryRole?: AccountRole;
  displayName?: string;
  phone?: string;
  supabaseId?: string;
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
  if (user.primaryRole === "admin") return null;
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

  let primaryRole: AccountRole | undefined;
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

function getLoginActiveRole(user: StoredUser): AppRole {
  if (accountHasAdminRole(user.roles)) {
    if (user.primaryRole === "admin") return "admin";
    if (user.roles.length === 1) return "admin";
  }

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

function upsertLocalUser(user: StoredUser): void {
  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === user.email);
  if (index === -1) {
    users.push(user);
  } else {
    users[index] = { ...users[index], ...user };
  }
  writeUsers(users);
}

function finalizeAuthSession(user: StoredUser, activeRole: AppRole): AuthResult {
  const session = createAuthSession({ email: user.email, roles: user.roles, activeRole });
  persistAuthSession(session);
  if (activeRole !== "admin") {
    rememberActiveRole(activeRole);
  }
  applyRoleSetup(activeRole);
  syncProfileCacheForUser(user);
  if (user.roles.includes("runner")) {
    syncRunnerDeviceStateFromUser(user);
  }
  return { ok: true, homePath: getRoleHomePath(activeRole) };
}

export function applyRemoteProfileToLocalSession(
  profile: ReturnType<typeof import("./supabase/profiles-remote").rowToStoredShape>,
  supabaseId: string,
): void {
  const user: StoredUser = migrateUserRecord({
    email: profile.email,
    password: "",
    supabaseId,
    roles: profile.roles.length > 0 ? profile.roles : ["customer"],
    primaryRole: profile.primaryRole,
    displayName: profile.displayName,
    phone: profile.phone,
    runnerStatus: profile.runnerStatus,
    runnerStage: profile.runnerStage,
  });

  upsertLocalUser(user);
  const current = getAuthSession();
  let activeRole = getLoginActiveRole(user);
  if (
    current &&
    current.email.toLowerCase() === user.email.toLowerCase() &&
    user.roles.includes(current.activeRole)
  ) {
    activeRole = current.activeRole;
  }
  const session = createAuthSession({ email: user.email, roles: user.roles, activeRole });
  persistAuthSession(session);
  if (activeRole !== "admin") {
    rememberActiveRole(activeRole);
  }
  applyRoleSetup(activeRole);
  syncProfileCacheForUser(user);
  if (user.roles.includes("runner")) {
    migrateLegacyRunnerAccount(user.email);
    syncRunnerDeviceStateFromUser(user);
  }
  notifyRunnerAccountChanged();
}

export async function syncCurrentUserProfileToRemote(
  patch: Partial<Pick<StoredUser, "displayName" | "phone" | "runnerStatus" | "runnerStage">>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const session = getAuthSession();
  if (!session) return;

  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === session.email);
  if (index === -1) return;

  const user = { ...users[index], ...patch };
  users[index] = user;
  writeUsers(users);

  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const userId = user.supabaseId ?? data.user?.id;
  if (!userId) return;

  await upsertRemoteProfile(userId, {
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    roles: user.roles,
    primaryRole: user.primaryRole,
    runnerStatus: user.runnerStatus,
    runnerStage: user.runnerStage,
  });
}

export async function registerUser(input: {
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  wantRunner: boolean;
  wantBusiness: boolean;
}): Promise<AuthResult> {
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

  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { ok: false, error: "Enter a valid Namibia mobile number (e.g. 081 123 4567)." };
  }

  const roles = buildRoles(input.wantRunner, input.wantBusiness);
  const primaryRole: PublicRole = input.wantRunner
    ? "runner"
    : input.wantBusiness
      ? "business"
      : "customer";

  if (isSupabaseConfigured()) {
    const existing = await fetchProfileByEmail(email);
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const remote = await signUpRemote(email, password, {
      email,
      phone,
      roles,
      primaryRole,
      runnerStatus: input.wantRunner ? "in_progress" : undefined,
      runnerStage: input.wantRunner ? "service-selection" : undefined,
    });

    if (!remote.ok) {
      return { ok: false, error: remote.error };
    }

    const newUser: StoredUser = {
      email,
      password: "",
      roles,
      primaryRole,
      phone,
      supabaseId: remote.userId,
      runnerStatus: input.wantRunner ? "in_progress" : undefined,
      runnerStage: input.wantRunner ? "service-selection" : undefined,
    };

    if (input.wantRunner) {
      setRunnerAccess(true);
      setRunnerApproved(false);
    }

    upsertLocalUser(newUser);
    return finalizeAuthSession(newUser, primaryRole);
  }

  if (!isLocalDevAuthAllowed()) {
    return {
      ok: false,
      error: "Sign up requires Lovable Cloud. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, or set VITE_ALLOW_LOCAL_DEV=true for offline dev only.",
    };
  }

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const newUser: StoredUser = { email, password, roles, primaryRole, phone };
  if (input.wantRunner) {
    newUser.runnerStatus = "in_progress";
    newUser.runnerStage = "service-selection";
    setRunnerAccess(true);
    setRunnerApproved(false);
  }
  upsertLocalUser(newUser);
  return finalizeAuthSession(newUser, primaryRole);
}

function syncProfileCacheForUser(user: StoredUser): void {
  if (typeof window === "undefined") return;

  if (user.displayName?.trim()) {
    window.localStorage.setItem("lr-profile-name", user.displayName.trim());
  } else {
    const legacyName = window.localStorage.getItem("lr-profile-name")?.trim();
    if (legacyName) {
      const users = readUsers();
      const index = users.findIndex((entry) => entry.email === user.email);
      if (index !== -1) {
        users[index] = { ...users[index], displayName: legacyName };
        writeUsers(users);
      }
    }
  }

  if (user.phone) {
    window.localStorage.setItem(PROFILE_PHONE_KEY, user.phone);
    return;
  }

  const legacyPhone = window.localStorage.getItem(PROFILE_PHONE_KEY)?.trim();
  if (!legacyPhone || !isValidPhone(legacyPhone)) return;

  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === user.email);
  if (index === -1) return;

  const normalized = normalizePhone(legacyPhone);
  if (!normalized) return;

  users[index] = { ...users[index], phone: normalized };
  writeUsers(users);
}

export async function requestPasswordReset(emailInput: string): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter the email address for your account." };
  }

  if (!isSupabaseConfigured()) {
    if (!isLocalDevAuthAllowed()) {
      return {
        ok: false,
        error:
          "Password reset requires Lovable Cloud. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.",
      };
    }
    return {
      ok: false,
      error: "Password reset is not available in offline dev mode. Use your existing password.",
    };
  }

  try {
    const serverResult = await requestPasswordResetServer({ data: { email } });
    if (!serverResult.ok) {
      return { ok: false, error: serverResult.error };
    }
    return { ok: true, homePath: "/customer/signin" };
  } catch {
    // Server function unavailable (e.g. offline dev) — fall back to browser client.
  }

  const result = await requestPasswordResetRemote(email);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, homePath: "/customer/signin" };
}

export async function completePasswordReset(input: {
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const password = input.password;

  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  if (password !== input.confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Password reset requires Lovable Cloud." };
  }

  const result = await updatePasswordRemote(password);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await signOutRemote();
  resetSupabaseAuthCache();
  clearAuthSession();

  return { ok: true, homePath: "/customer/signin" };
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  if (isSupabaseConfigured()) {
    const remote = await signInRemote(email, input.password);
    if (!remote.ok) {
      return { ok: false, error: remote.error };
    }

    await ensureBootstrapAdmin();

    const freshRow = await fetchProfileByUserId(remote.userId);
    const profile = freshRow ? rowToStoredShape(freshRow) : remote.profile;
    const user: StoredUser = migrateUserRecord({
      email: profile.email,
      password: "",
      supabaseId: remote.userId,
      roles: profile.roles.length > 0 ? profile.roles : ["customer"],
      primaryRole: profile.primaryRole,
      displayName: profile.displayName,
      phone: profile.phone,
      runnerStatus: profile.runnerStatus,
      runnerStage: profile.runnerStage,
    });

    upsertLocalUser(user);
    if (user.roles.includes("runner")) {
      migrateLegacyRunnerAccount(user.email);
    }
    const activeRole = getLoginActiveRole(user);
    return finalizeAuthSession(user, activeRole);
  }

  if (!isLocalDevAuthAllowed()) {
    return {
      ok: false,
      error: "Sign in requires Lovable Cloud. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, or set VITE_ALLOW_LOCAL_DEV=true for offline dev only.",
    };
  }

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

  if (user.roles.includes("runner")) {
    migrateLegacyRunnerAccount(user.email);
  }
  const activeRole = getLoginActiveRole(user);
  return finalizeAuthSession(user, activeRole);
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

/** Sign out of Supabase and clear the local app session mirror. */
export async function logoutUser(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      await signOutRemote();
    }
  } finally {
    resetSupabaseAuthCache();
    clearAuthSession();
  }
}

const PROFILE_REFRESH_MIN_MS = 12_000;
let lastProfileRefreshAt = 0;

/** Re-load roles from Supabase `profiles` (source of truth when cloud is on). */
export async function refreshAuthSessionFromProfile(force = false): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const now = Date.now();
  if (!force && now - lastProfileRefreshAt < PROFILE_REFRESH_MIN_MS) {
    return Boolean(getAuthSession());
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return false;

  await ensureBootstrapAdmin();

  const row = await fetchProfileByUserId(userId);
  if (!row) return false;

  applyRemoteProfileToLocalSession(rowToStoredShape(row), userId);
  lastProfileRefreshAt = Date.now();
  return true;
}

export function getUserDisplayName(email?: string): string | null {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) return null;

  const user = readUsers().find((entry) => entry.email === sessionEmail);
  const name = user?.displayName?.trim();
  return name || null;
}

export function getUserPhone(email?: string): string | null {
  const sessionEmail = email ?? getAuthSession()?.email;
  if (!sessionEmail) return null;

  const user = readUsers().find((entry) => entry.email === sessionEmail);
  const phone = user?.phone?.trim();
  if (phone) return phone;

  if (typeof window !== "undefined") {
    const legacy = window.localStorage.getItem(PROFILE_PHONE_KEY)?.trim();
    if (legacy && isValidPhone(legacy)) {
      return normalizePhone(legacy);
    }
  }

  return null;
}

export function updateUserPhone(phoneInput: string): boolean {
  const session = getAuthSession();
  if (!session) return false;

  const phone = normalizePhone(phoneInput);
  if (!phone) return false;

  const users = readUsers();
  const index = users.findIndex((entry) => entry.email === session.email);
  if (index === -1) return false;

  users[index] = { ...users[index], phone };
  writeUsers(users);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROFILE_PHONE_KEY, phone);
  }

  void syncCurrentUserProfileToRemote({ phone });
  return true;
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

  void syncCurrentUserProfileToRemote({ displayName: trimmed });
  return true;
}

export function hasCustomerProfile(email?: string): boolean {
  return Boolean(getUserDisplayName(email)) && Boolean(getUserPhone(email));
}

export type DirectoryUser = {
  email: string;
  displayName: string;
  roles: AccountRole[];
  runnerStatus?: RunnerOnboardingStatus;
};

/** Registered accounts on this device (local auth store). */
export function listUsersForDirectory(): DirectoryUser[] {
  return readUsers().map((user) => ({
    email: user.email,
    displayName: user.displayName?.trim() || user.email,
    roles: user.roles,
    runnerStatus: user.runnerStatus,
  }));
}

export async function getSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
