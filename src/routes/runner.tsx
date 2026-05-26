import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RunnerLocationSync } from "@/components/runner-location-sync";
import { getAuthSession } from "@/lib/auth-session";
import { getRunnerOnboardingStatus } from "@/lib/runner-account";
import { isSupabaseAuthRateLimited, waitForSupabaseSession } from "@/lib/auth/ensure-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getRoleHomePath,
  getRunnerHomePath,
  getStoredRunnerStage,
  hasRunnerConsoleAccess,
  setStoredRunnerStage,
} from "@/lib/store";

const RUNNER_CONSOLE_PATHS = new Set([
  "/runner/dashboard",
  "/runner/active-job",
  "/runner/rate-customer",
  "/runner/performance",
  "/runner/earnings",
  "/runner/settings",
  "/runner/payout-details",
  "/runner/activity-history",
  "/runner/support-help",
  "/runner/incoming-job-alert",
]);

const RUNNER_ONBOARDING_PATHS = new Set([
  "/runner/service-selection",
  "/runner/onboarding/documents",
  "/runner/onboarding/vehicle",
  "/runner/onboarding/banking",
  "/runner/onboarding/training",
  "/runner/onboarding/verification",
]);

export const Route = createFileRoute("/runner")({
  beforeLoad: async ({ location }) => {
    const session = getAuthSession();
    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (session.activeRole !== "runner") {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    const path = location.pathname.replace(/\/$/, "") || "/";

    if (isSupabaseConfigured() && RUNNER_CONSOLE_PATHS.has(path)) {
      const cloudSession = await waitForSupabaseSession(3500);
      if (!cloudSession && !isSupabaseAuthRateLimited()) {
        throw redirect({
          to: "/customer/signin",
          search: { reason: "session_expired", role: "runner" },
        });
      }
    }

    if (!getStoredRunnerStage()) {
      setStoredRunnerStage("service-selection");
    }

    if (path === "/runner") {
      throw redirect({ to: getRunnerHomePath() });
    }

    if (path === "/runner/access") {
      throw redirect({ to: getRunnerHomePath() });
    }

    const status = getRunnerOnboardingStatus();

    if (RUNNER_ONBOARDING_PATHS.has(path) && status === "approved") {
      throw redirect({ to: "/runner/dashboard" });
    }

    if (
      (status === "pending_verification" || status === "rejected") &&
      RUNNER_CONSOLE_PATHS.has(path)
    ) {
      throw redirect({ to: "/runner/onboarding/verification" });
    }

    if (
      (status === "pending_verification" || status === "rejected") &&
      RUNNER_ONBOARDING_PATHS.has(path) &&
      path !== "/runner/onboarding/verification"
    ) {
      throw redirect({ to: "/runner/onboarding/verification" });
    }

    if (RUNNER_CONSOLE_PATHS.has(path) && !hasRunnerConsoleAccess()) {
      throw redirect({ to: getRunnerHomePath() });
    }
  },
  component: RunnerLayout,
});

function RunnerLayout() {
  return (
    <>
      <RunnerLocationSync />
      <Outlet />
    </>
  );
}
