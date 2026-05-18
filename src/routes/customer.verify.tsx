import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath } from "@/lib/store";
import { CustomerVerifyPage } from "./auth.verify";

export const Route = createFileRoute("/customer/verify")({
  beforeLoad: () => {
    const session = getAuthSession();
    if (session) {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }
  },
  component: CustomerVerifyPage,
});
