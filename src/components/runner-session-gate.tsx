import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthSession } from "@/lib/auth-session";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

const RUNNER_CONSOLE_PREFIXES = [
  "/runner/dashboard",
  "/runner/active-job",
  "/runner/incoming-job-alert",
  "/runner/rate-customer",
  "/runner/earnings",
  "/runner/settings",
];

function isRunnerConsolePath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return RUNNER_CONSOLE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Redirects to sign-in when cloud is on but Supabase JWT is missing (after hydration). */
export function RunnerSessionGate() {
  const navigate = useNavigate();
  const { session, loading, isConfigured } = useSupabaseSession();

  useEffect(() => {
    if (!isConfigured || loading) return;
    if (typeof window === "undefined") return;
    if (!isRunnerConsolePath(window.location.pathname)) return;

    const appSession = getAuthSession();
    if (!appSession || appSession.activeRole !== "runner") return;

    if (!session) {
      navigate({
        to: "/customer/signin",
        search: { reason: "session_expired", role: "runner" },
        replace: true,
      });
    }
  }, [isConfigured, loading, session, navigate]);

  return null;
}
