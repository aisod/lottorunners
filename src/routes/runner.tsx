import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRunnerOnboardingStatus } from "@/lib/runner-account";
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
    const session = await reconcileCloudAuthSession();
    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (session.activeRole !== "runner") {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    const path = location.pathname.replace(/\/$/, "") || "/";

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
      RUNNER_ONBOARDING_PATHS.has(path) &&
      status === "pending_verification" &&
      path !== "/runner/onboarding/verification"
    ) {
      throw redirect({ to: "/runner/dashboard" });
    }

    if (RUNNER_CONSOLE_PATHS.has(path) && !hasRunnerConsoleAccess()) {
      throw redirect({ to: getRunnerHomePath() });
    }
  },
  component: RunnerLayout,
});

function RunnerLayout() {
  return <Outlet />;
}
