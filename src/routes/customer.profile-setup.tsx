import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerBrandMark } from "@/components/customer-header-logo";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { getUserDisplayName, updateUserDisplayName } from "@/lib/auth-users";

export const Route = createFileRoute("/customer/profile-setup")({
  component: CustomerProfileSetupPage,
});

function CustomerProfileSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getUserDisplayName();
    if (saved) {
      setName(saved);
      navigate({ to: "/customer/home", replace: true });
    }
  }, [navigate]);

  const finishSetup = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your full name.");
      return;
    }

    if (!updateUserDisplayName(trimmed)) {
      setError("Could not save your profile. Try signing in again.");
      return;
    }

    navigate({ to: "/customer/home" });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col justify-center px-2 py-10 sm:px-4">
        <CustomerBrandMark className="mb-6" />
        <h1 className="text-3xl font-black tracking-tight">Set up your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">One last step before booking your first service.</p>
        <label className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="mt-2 h-12 rounded-xl border bg-card px-4 text-sm outline-none ring-primary/30 focus:ring"
        />
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-6 h-12" onClick={finishSetup}>
          Finish setup
        </Button>
      </div>
    </CustomerPageShell>
  );
}
