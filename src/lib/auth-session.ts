import type { AppRole } from "./store";

export type AuthMode = "signup" | "login";
export type PublicRole = "customer" | "runner" | "business";

export interface AuthSession {
  email: string;
  roles: PublicRole[];
  activeRole: AppRole;
  authenticatedAt: string;
}

const AUTH_SESSION_KEY = "lr-auth-session-v1";
const PENDING_AUTH_ROLE_KEY = "lr-pending-auth-role-v1";
const PENDING_AUTH_MODE_KEY = "lr-pending-auth-mode-v1";

function isPublicRole(value: string): value is PublicRole {
  return value === "customer" || value === "runner" || value === "business";
}

function isRole(value: string | null): value is AppRole {
  return value === "customer" || value === "runner" || value === "business" || value === "admin";
}

function normalizeRoles(roles: unknown): PublicRole[] {
  if (!Array.isArray(roles)) return ["customer"];
  const next = roles.filter((role): role is PublicRole => typeof role === "string" && isPublicRole(role));
  return next.length > 0 ? Array.from(new Set(next)) : ["customer"];
}

function parseLegacySession(parsed: Record<string, unknown>): AuthSession | null {
  const legacyRoleRaw = parsed.role;
  const legacyRole = typeof legacyRoleRaw === "string" ? legacyRoleRaw : null;
  if (!isRole(legacyRole)) return null;

  if (legacyRole === "admin") {
    return {
      email: typeof parsed.email === "string" ? parsed.email : "admin@local",
      roles: [],
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
      roles: normalizeRoles(parsed.roles ?? [activeRole]),
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
  roles: PublicRole[];
  activeRole?: AppRole;
}): AuthSession {
  const roles = normalizeRoles(input.roles);
  const activeRole =
    input.activeRole && (input.activeRole === "admin" || roles.includes(input.activeRole))
      ? input.activeRole
      : roles[0];

  return {
    email: input.email.trim().toLowerCase(),
    roles,
    activeRole,
    authenticatedAt: new Date().toISOString(),
  };
}

export function setAuthSession(role: AppRole): void {
  const current = getAuthSession();
  if (current) {
    persistAuthSession({ ...current, activeRole: role });
    return;
  }

  if (role === "admin") {
    persistAuthSession({
      email: "admin@local",
      roles: [],
      activeRole: "admin",
      authenticatedAt: new Date().toISOString(),
    });
    return;
  }

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
    if (session.activeRole !== "admin") return false;
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
