import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { reconcileCloudAuthSession } from "@/lib/auth/cloud-session";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/splash")({
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = setTimeout(() => {
      void reconcileCloudAuthSession().then((session) => {
        if (session) {
          navigate({ to: getRoleHomePath(session.activeRole) });
          return;
        }
        navigate({ to: "/customer/signin" });
      });
    }, 1200);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <img src={logo} alt="Lotto Runners" className="h-24 w-24 object-contain" />
      <h1 className="mt-4 text-3xl font-black uppercase tracking-wide text-primary">Lotto Runners</h1>
      <p className="mt-2 text-sm text-muted-foreground">Loading your city services…</p>
    </div>
  );
}
