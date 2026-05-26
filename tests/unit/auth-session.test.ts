import { describe, expect, it } from "vitest";
import {
  clearAuthSession,
  createAuthSession,
  getAuthSession,
  persistAuthSession,
  sessionHasAdminAccess,
  setActiveRole,
  setAuthSession,
} from "@/lib/auth-session";
import { isLocalDevAuthAllowed } from "@/lib/supabase/config";

describe("auth session (lr-auth-session-v1)", () => {
  it("creates session with normalized email and valid activeRole", () => {
    const session = createAuthSession({
      email: "User@Test.COM",
      roles: ["customer", "runner"],
      activeRole: "runner",
    });
    expect(session.email).toBe("user@test.com");
    expect(session.activeRole).toBe("runner");
    expect(session.roles).toContain("runner");
  });

  it("rejects admin activeRole when roles omit admin", () => {
    const session = createAuthSession({
      email: "user@test.com",
      roles: ["customer"],
      activeRole: "admin",
    });
    expect(session.activeRole).not.toBe("admin");
  });

  it("persists and reloads session (session persistence)", () => {
    persistAuthSession(
      createAuthSession({
        email: "persist@test.com",
        roles: ["business"],
        activeRole: "business",
      }),
    );
    const loaded = getAuthSession();
    expect(loaded?.email).toBe("persist@test.com");
    expect(loaded?.activeRole).toBe("business");
  });

  it("clears session on sign-out", () => {
    persistAuthSession(
      createAuthSession({ email: "a@test.com", roles: ["customer"], activeRole: "customer" }),
    );
    clearAuthSession();
    expect(getAuthSession()).toBeNull();
  });

  it("setActiveRole enforces role permissions", () => {
    persistAuthSession(
      createAuthSession({
        email: "multi@test.com",
        roles: ["customer", "business"],
        activeRole: "customer",
      }),
    );
    expect(setActiveRole("business")).toBe(true);
    expect(getAuthSession()?.activeRole).toBe("business");
    expect(setActiveRole("admin")).toBe(false);
  });

  it("sessionHasAdminAccess reflects roles array", () => {
    persistAuthSession(
      createAuthSession({
        email: "admin@test.com",
        roles: ["admin", "customer"],
        activeRole: "admin",
      }),
    );
    expect(sessionHasAdminAccess(getAuthSession())).toBe(true);
  });

  it("setAuthSession cannot promote to admin without admin role", () => {
    persistAuthSession(
      createAuthSession({ email: "u@test.com", roles: ["customer"], activeRole: "customer" }),
    );
    setAuthSession("admin");
    expect(getAuthSession()?.activeRole).toBe("customer");
  });

  it("guest session only when local dev explicitly allowed", () => {
    if (!isLocalDevAuthAllowed()) return;
    clearAuthSession();
    setAuthSession("customer");
    expect(getAuthSession()?.email).toBe("guest@local");
  });
});
