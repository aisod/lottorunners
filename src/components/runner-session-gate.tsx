import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/auth-session";
import {
  hasSupabaseAuthStorage,
  isSupabaseAuthRateLimited,
} from "@/lib/auth/ensure-session";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

const RUNNER_CONSOLE_PREFIXES = [
  "/runner/dashboard",
  "/runner/active-job",
  "/runner/incoming-job-alert",
  "/runner/rate-customer",
  "/runner/earnings",
  "/runner/settings",
];

const HYDRATION_GRACE_MS = 3_000;

function isRunnerConsolePath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return RUNNER_CONSOLE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Redirects to sign-in when cloud is on but Supabase JWT is missing (after hydration). */
export function RunnerSessionGate() {
  const navigate = useNavigate();
  const { session, loading, isConfigured } = useSupabaseSession();
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setGraceElapsed(true), HYDRATION_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isConfigured || loading || !graceElapsed) return;
    if (typeof window === "undefined") return;
    if (!isRunnerConsolePath(window.location.pathname)) return;
    if (isSupabaseAuthRateLimited()) return;

    const appSession = getAuthSession();
    if (!appSession || appSession.activeRole !== "runner") return;

    if (!session && !hasSupabaseAuthStorage()) {
      navigate({
        to: "/customer/signin",
        search: { reason: "session_expired", role: "runner" },
        replace: true,
      });
    }
  }, [isConfigured, loading, graceElapsed, session, navigate]);

  return null;
}
