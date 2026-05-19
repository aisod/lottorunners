import { createFileRoute, redirect } from "@tanstack/react-router";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await reconcileCloudAuthSession();
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
