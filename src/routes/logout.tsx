import { createFileRoute, redirect } from "@tanstack/react-router";
import { clearAuthSession, clearPendingAuth } from "@/lib/auth-session";
import { clearPrototypeRoleState } from "@/lib/store";

export const Route = createFileRoute("/logout")({
  beforeLoad: () => {
    clearAuthSession();
    clearPendingAuth();
    clearPrototypeRoleState();
    throw redirect({ to: "/customer/signin" });
  },
});
