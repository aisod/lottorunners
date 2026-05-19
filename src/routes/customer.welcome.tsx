import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Lock, Mail, Phone } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { clearPendingAuth } from "@/lib/auth-session";
import { redirectIfAuthenticated } from "@/lib/auth/route-guards";
import { registerUser } from "@/lib/auth-users";

export const Route = createFileRoute("/customer/welcome")({
  beforeLoad: async () => {
    clearPendingAuth();
    await redirectIfAuthenticated();
  },
  component: CustomerWelcomePage,
});

function CustomerWelcomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [wantRunner, setWantRunner] = useState(false);
  const [wantBusiness, setWantBusiness] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectRunner = (checked: boolean) => {
    setWantRunner(checked);
    if (checked) setWantBusiness(false);
  };

  const selectBusiness = (checked: boolean) => {
    setWantBusiness(checked);
    if (checked) setWantRunner(false);
  };

  const signUp = () => {
    setError(null);
    void registerUser({
      email,
      phone,
      password,
      confirmPassword,
      wantRunner,
      wantBusiness,
    }).then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.message) {
        navigate({
          to: "/customer/signin",
          search: { notice: result.message },
        });
        return;
      }
      navigate({ to: result.homePath });
    });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col px-2 py-4 sm:px-4">
        <div className="w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_8px_40px_-12px_oklch(0.35_0.08_258/0.18)]">
          <div className="space-y-5 px-5 pb-6 pt-6 sm:px-6">
            <div className="text-center">
              <img src={logo} alt="Lotto Runners" className="mx-auto h-20 w-20 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-destructive">Create account</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Join Lotto Runners in a few steps</p>
            </div>

            <div className="space-y-3">
              <AuthField
                id="signup-email"
                icon={Mail}
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <AuthField
                id="signup-phone"
                icon={Phone}
                label="Mobile number"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <AuthField
                id="signup-password"
                icon={Lock}
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <AuthField
                id="signup-confirm-password"
                icon={Lock}
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Register as</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3">
                  <Checkbox checked={wantRunner} onCheckedChange={(checked) => selectRunner(checked === true)} />
                  <span className="text-sm font-medium">Runner</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3">
                  <Checkbox checked={wantBusiness} onCheckedChange={(checked) => selectBusiness(checked === true)} />
                  <span className="text-sm font-medium">Business</span>
                </label>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={signUp}>
              Sign up
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/customer/signin" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </CustomerPageShell>
  );
}
