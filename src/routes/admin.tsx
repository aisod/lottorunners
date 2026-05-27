import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminConsoleShell } from "@/components/console-shell";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import { guardCloudSessionForRole } from "@/lib/auth/require-cloud-session";
import { getAuthSession, sessionHasAdminAccess, setActiveRole } from "@/lib/auth-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureBootstrapAdmin } from "@/lib/supabase/profiles-remote";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (!canRunClientAuthGuard()) return;

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

    if (isSupabaseConfigured()) {
      await ensureBootstrapAdmin();
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
