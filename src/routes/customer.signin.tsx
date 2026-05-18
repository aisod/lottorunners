import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { clearPendingAuth, getAuthSession } from "@/lib/auth-session";
import { loginUser } from "@/lib/auth-users";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/customer/signin")({
  beforeLoad: () => {
    clearPendingAuth();

    const session = getAuthSession();
    if (session) {
      throw redirect({ to: getRoleHomePath(session.activeRole) });
    }
  },
  component: CustomerSignInPage,
});

function CustomerSignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signIn = () => {
    setError(null);
    const result = loginUser({ email, password });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate({ to: result.homePath });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col px-2 py-4 sm:px-4">
        <div className="w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_8px_40px_-12px_oklch(0.35_0.08_258/0.18)]">
          <div className="space-y-5 px-5 pb-6 pt-6 sm:px-6">
            <div className="text-center">
              <img src={logo} alt="Lotto Runners" className="mx-auto h-20 w-20 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue with Lotto Runners</p>
            </div>

            <div className="space-y-3">
              <AuthField
                id="signin-email"
                icon={Mail}
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <AuthField
                id="signin-password"
                icon={Lock}
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-semibold text-primary hover:underline"
                onClick={() => window.alert("Password reset coming soon")}
              >
                Forgot your password?
              </button>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={signIn}>
              Sign in
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/customer/welcome" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </CustomerPageShell>
  );
}
