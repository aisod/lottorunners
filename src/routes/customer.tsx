import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { guardCloudSessionForRole } from "@/lib/auth/require-cloud-session";
import { getAuthSession } from "@/lib/auth-session";
import { useCustomerApp } from "@/lib/customer-store";
import { getRoleHomePath } from "@/lib/store";

const PUBLIC_CUSTOMER_AUTH_PATHS = new Set([
  "/customer/welcome",
  "/customer/signin",
  "/customer/onboarding-login",
  "/customer/verify",
]);

export const Route = createFileRoute("/customer")({
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    const session = getAuthSession();

    if (PUBLIC_CUSTOMER_AUTH_PATHS.has(path)) {
      if (session && session.activeRole !== "customer") {
        throw redirect({ to: getRoleHomePath(session.activeRole) });
      }
      return;
    }

    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (session.activeRole !== "customer") {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    await guardCloudSessionForRole("customer");

    if (path === "/customer") {
      throw redirect({ to: getRoleHomePath("customer") });
    }
  },
  component: CustomerLayout,
});

function CustomerLayout() {
  const hydrateHistory = useCustomerApp((s) => s.hydrateHistory);
  const hydrateBookingDraft = useCustomerApp((s) => s.hydrateBookingDraft);

  useEffect(() => {
    hydrateHistory();
    hydrateBookingDraft();
  }, [hydrateHistory, hydrateBookingDraft]);

  return <Outlet />;
}
