import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BusinessConsoleShell } from "@/components/console-shell";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/business")({
  beforeLoad: async ({ location }) => {
    const session = await reconcileCloudAuthSession();
    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (session.activeRole !== "business") {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/business") {
      throw redirect({ to: "/business/dashboard" });
    }
  },
  component: BusinessLayout,
});

function BusinessLayout() {
  return (
    <BusinessConsoleShell>
      <Outlet />
    </BusinessConsoleShell>
  );
}
