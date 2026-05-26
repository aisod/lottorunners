import {
  clearAuthSession,
  createAuthSession,
  persistAuthSession,
  sessionHasAdminAccess,
} from "@/lib/auth-session";
import type { AccountRole } from "@/lib/auth-session";
import type { AppRole } from "@/lib/store";

export function seedAuthSession(input: {
  email: string;
  roles: AccountRole[];
  activeRole: AppRole;
}): void {
  clearAuthSession();
  persistAuthSession(
    createAuthSession({
      email: input.email,
      roles: input.roles,
      activeRole: input.activeRole,
    }),
  );
}

export function seedApprovedRunner(email = "runner@test.com"): void {
  localStorage.setItem(
    "lr-users-v1",
    JSON.stringify([
      {
        email,
        password: "test",
        roles: ["runner", "customer"],
        runnerStatus: "approved",
        runnerStage: "dashboard",
      },
    ]),
  );
  seedAuthSession({ email, roles: ["runner", "customer"], activeRole: "runner" });
}

export { sessionHasAdminAccess };
