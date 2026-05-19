import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getAuthSession, type PublicRole } from "@/lib/auth-session";
import { switchAccountRole } from "@/lib/auth-users";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<PublicRole, string> = {
  customer: "Customer",
  runner: "Runner",
  business: "Business",
};

type RoleSwitcherProps = {
  className?: string;
  title?: string;
};

export function RoleSwitcher({ className, title = "Switch role" }: RoleSwitcherProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const session = useMemo(() => getAuthSession(), []);

  if (!session || session.roles.length <= 1) {
    return null;
  }

  const handleSwitch = (role: PublicRole) => {
    if (role === session.activeRole) return;

    const result = switchAccountRole(role);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    navigate({ to: result.homePath });
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {session.roles.filter((role) => role !== "admin").map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => handleSwitch(role)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              session.activeRole === role
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40",
            )}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
