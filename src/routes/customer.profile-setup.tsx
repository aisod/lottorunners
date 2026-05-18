import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerBrandMark } from "@/components/customer-header-logo";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import {
  getUserDisplayName,
  getUserPhone,
  hasCustomerProfile,
  updateUserDisplayName,
  updateUserPhone,
} from "@/lib/auth-users";
import { formatPhoneDisplay } from "@/lib/phone-utils";

export const Route = createFileRoute("/customer/profile-setup")({
  component: CustomerProfileSetupPage,
});

function CustomerProfileSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasCustomerProfile()) {
      navigate({ to: "/customer/home", replace: true });
      return;
    }
    const savedName = getUserDisplayName();
    const savedPhone = getUserPhone();
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(formatPhoneDisplay(savedPhone));
  }, [navigate]);

  const finishSetup = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your full name.");
      return;
    }

    if (!updateUserDisplayName(trimmed)) {
      setError("Could not save your name. Try signing in again.");
      return;
    }

    if (!updateUserPhone(phone)) {
      setError("Enter a valid Namibia mobile number (e.g. 081 123 4567).");
      return;
    }

    navigate({ to: "/customer/home" });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col justify-center px-2 py-10 sm:px-4">
        <CustomerBrandMark className="mb-6" />
        <h1 className="text-3xl font-black tracking-tight">Set up your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add your name and mobile number so runners can reach you.</p>
        <label className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="mt-2 h-12 rounded-xl border bg-card px-4 text-sm outline-none ring-primary/30 focus:ring"
        />
        <label className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile number</label>
        <div className="relative mt-2">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="081 123 4567"
            className="h-12 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none ring-primary/30 focus:ring"
          />
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-6 h-12" onClick={finishSetup}>
          Finish setup
        </Button>
      </div>
    </CustomerPageShell>
  );
}
