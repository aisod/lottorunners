import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminConsoleShell } from "@/components/console-shell";
import { guardCloudSessionForRole } from "@/lib/auth/require-cloud-session";
import { getAuthSession, sessionHasAdminAccess, setActiveRole } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const session = getAuthSession();
    if (!session) {
      throw redirect({ to: "/customer/signin" });
    }

    if (!sessionHasAdminAccess(session)) {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    if (session.activeRole !== "admin") {
      setActiveRole("admin");
    }

    await guardCloudSessionForRole("admin");

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
