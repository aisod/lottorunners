import { createFileRoute, redirect } from "@tanstack/react-router";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!canRunClientAuthGuard()) return;

    const session = getAuthSession();
    if (session) {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    throw redirect({ to: "/customer/signin" });
  },
  component: RootEntryRedirect,
});

function RootEntryRedirect() {
  return null;
}
