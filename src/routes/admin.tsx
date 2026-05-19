import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminConsoleShell } from "@/components/console-shell";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const session = await reconcileCloudAuthSession();
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
