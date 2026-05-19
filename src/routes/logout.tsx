import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearPendingAuth } from "@/lib/auth-session";
import { logoutUser } from "@/lib/auth-users";
import { teardownPlatformSync } from "@/lib/platform-sync";
import { clearPrototypeRoleState } from "@/lib/store";

export const Route = createFileRoute("/logout")({
  component: LogoutPage,
});

function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await logoutUser();
      clearPendingAuth();
      clearPrototypeRoleState();
      teardownPlatformSync();
      navigate({ to: "/customer/signin", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <p className="text-sm font-medium text-muted-foreground">Signing out…</p>
    </div>
  );
}
