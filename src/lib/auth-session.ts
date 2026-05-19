import type { AppRole } from "./store";

export type AuthMode = "signup" | "login";
export type PublicRole = "customer" | "runner" | "business";
/** Roles stored on `profiles.roles` (includes admin when granted in Supabase). */
export type AccountRole = PublicRole | "admin";

export interface AuthSession {
  email: string;
  /** Mirrors `profiles.roles` (customer/runner/business/admin). */
  roles: AccountRole[];
  activeRole: AppRole;
  authenticatedAt: string;
}

const AUTH_SESSION_KEY = "lr-auth-session-v1";
const PENDING_AUTH_ROLE_KEY = "lr-pending-auth-role-v1";
const PENDING_AUTH_MODE_KEY = "lr-pending-auth-mode-v1";

function isPublicRole(value: string): value is PublicRole {
  return value === "customer" || value === "runner" || value === "business";
}

function isAccountRole(value: string): value is AccountRole {
  return isPublicRole(value) || value === "admin";
}

function isRole(value: string | null): value is AppRole {
  return value === "customer" || value === "runner" || value === "business" || value === "admin";
}

export function normalizeAccountRoles(roles: unknown): AccountRole[] {
  if (!Array.isArray(roles)) return ["customer"];
  const next = roles.filter((role): role is AccountRole => typeof role === "string" && isAccountRole(role));
  return next.length > 0 ? Array.from(new Set(next)) : ["customer"];
}

export function accountHasAdminRole(roles: AccountRole[]): boolean {
  return roles.includes("admin");
}

export function sessionHasAdminAccess(session: AuthSession | null): boolean {
  return Boolean(session && accountHasAdminRole(session.roles));
}

function parseLegacySession(parsed: Record<string, unknown>): AuthSession | null {
  const legacyRoleRaw = parsed.role;
  const legacyRole = typeof legacyRoleRaw === "string" ? legacyRoleRaw : null;
  if (!isRole(legacyRole)) return null;

  if (legacyRole === "admin") {
    const email = typeof parsed.email === "string" ? parsed.email : "user@local";
    return {
      email,
      roles: ["admin"],
      activeRole: "admin",
      authenticatedAt:
        typeof parsed.authenticatedAt === "string" ? parsed.authenticatedAt : new Date().toISOString(),
    };
  }

  return {
    email: typeof parsed.email === "string" ? parsed.email : "user@local",
    roles: [legacyRole as PublicRole],
    activeRole: legacyRole,
    authenticatedAt:
      typeof parsed.authenticatedAt === "string" ? parsed.authenticatedAt : new Date().toISOString(),
  };
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const activeRoleRaw = parsed.activeRole ?? parsed.role;
    const activeRole = typeof activeRoleRaw === "string" ? activeRoleRaw : null;

    if (!isRole(activeRole)) {
      return parseLegacySession(parsed);
    }

    return {
      email: typeof parsed.email === "string" ? parsed.email : "user@local",
      roles: normalizeAccountRoles(parsed.roles ?? [activeRole]),
      activeRole,
      authenticatedAt:
        typeof parsed.authenticatedAt === "string"
          ? parsed.authenticatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function persistAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function createAuthSession(input: {
  email: string;
  roles: AccountRole[];
  activeRole?: AppRole;
}): AuthSession {
  const roles = normalizeAccountRoles(input.roles);
  let activeRole = input.activeRole ?? roles[0];

  if (activeRole === "admin" && !accountHasAdminRole(roles)) {
    activeRole = roles.find((r) => r !== "admin") ?? "customer";
  }
  if (activeRole !== "admin" && !roles.includes(activeRole)) {
    activeRole = roles.find((r) => r !== "admin") ?? "customer";
  }

  return {
    email: input.email.trim().toLowerCase(),
    roles,
    activeRole,
    authenticatedAt: new Date().toISOString(),
  };
}

/** Prototype/guest flows only — admin must come from `profiles.roles`. */
export function setAuthSession(role: AppRole): void {
  const current = getAuthSession();
  if (current) {
    if (role === "admin" && !accountHasAdminRole(current.roles)) return;
    persistAuthSession({ ...current, activeRole: role });
    return;
  }

  if (role === "admin") return;

  persistAuthSession(
    createAuthSession({
      email: "guest@local",
      roles: [role],
      activeRole: role,
    }),
  );
}

export function setActiveRole(role: AppRole): boolean {
  const session = getAuthSession();
  if (!session) return false;

  if (role === "admin") {
    if (!accountHasAdminRole(session.roles)) return false;
    persistAuthSession({ ...session, activeRole: "admin" });
    return true;
  }

  if (!session.roles.includes(role)) return false;

  persistAuthSession({ ...session, activeRole: role });
  return true;
}

export function hasAccountRole(role: PublicRole): boolean {
  return getAuthSession()?.roles.includes(role) ?? false;
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getAuthenticatedRole(): AppRole | null {
  return getAuthSession()?.activeRole ?? null;
}

export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

export function getPendingAuthRole(): AppRole | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_AUTH_ROLE_KEY);
  return isRole(value) ? value : null;
}

export function setPendingAuthRole(role: AppRole): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_AUTH_ROLE_KEY, role);
}

export function clearPendingAuthRole(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_AUTH_ROLE_KEY);
}

function isAuthMode(value: string | null): value is AuthMode {
  return value === "signup" || value === "login";
}

export function getPendingAuthMode(): AuthMode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_AUTH_MODE_KEY);
  return isAuthMode(value) ? value : null;
}

export function setPendingAuthMode(mode: AuthMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_AUTH_MODE_KEY, mode);
}

export function clearPendingAuthMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_AUTH_MODE_KEY);
}

export function clearPendingAuth(): void {
  clearPendingAuthRole();
  clearPendingAuthMode();
}
