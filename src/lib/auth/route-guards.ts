import { redirect } from "@tanstack/react-router";
import type { AuthSession } from "@/lib/auth-session";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRoleHomePath } from "@/lib/store";

const SESSION_EXPIRED_NOTICE =
  "Your session on this site expired or was from another preview. Sign in with your Lovable Cloud email and password.";

/** Use on sign-in / sign-up routes so a stale local-only session does not skip the form. */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await reconcileCloudAuthSession();
  if (session) {
    throw redirect({ to: getRoleHomePath(session.activeRole) });
  }
}

/** Use on protected routes; returns a cloud-validated session or redirects to sign-in. */
export async function requireAuthSession(): Promise<AuthSession> {
  const session = await reconcileCloudAuthSession();
  if (!session) {
    throw redirect({
      to: "/customer/signin",
      search: { notice: SESSION_EXPIRED_NOTICE },
    });
  }
  return session;
}
