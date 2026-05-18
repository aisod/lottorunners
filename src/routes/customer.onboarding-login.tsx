import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/customer/onboarding-login")({
  beforeLoad: () => {
    const session = getAuthSession();
    if (session) {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }

    throw redirect({ to: "/customer/signin" });
  },
});
