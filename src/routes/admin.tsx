import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminConsoleShell } from "@/components/console-shell";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const session = getAuthSession();
    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (session.activeRole !== "admin") {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/admin") {
      throw redirect({ to: "/admin/overview" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminConsoleShell>
      <Outlet />
    </AdminConsoleShell>
  );
}
