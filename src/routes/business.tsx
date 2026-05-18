import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BusinessConsoleShell } from "@/components/console-shell";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/business")({
  beforeLoad: ({ location }) => {
    const session = getAuthSession();
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
