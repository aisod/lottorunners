import { createFileRoute, redirect } from "@tanstack/react-router";
import { clearPendingAuth } from "@/lib/auth-session";
import { signOutEverywhere } from "@/lib/auth/cloud-session";
import { clearPrototypeRoleState } from "@/lib/store";

export const Route = createFileRoute("/logout")({
  beforeLoad: async () => {
    await signOutEverywhere();
    clearPendingAuth();
    clearPrototypeRoleState();
    throw redirect({ to: "/customer/signin" });
  },
});
