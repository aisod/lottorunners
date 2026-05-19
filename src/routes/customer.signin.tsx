import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { clearPendingAuth } from "@/lib/auth-session";
import { resendSignupConfirmation } from "@/lib/auth/resend-confirmation.server";
import { redirectIfAuthenticated } from "@/lib/auth/route-guards";
import { loginUser } from "@/lib/auth-users";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { requestPasswordReset } from "@/lib/supabase/profiles-remote";

export const Route = createFileRoute("/customer/signin")({
  validateSearch: (search: Record<string, unknown>) => ({
    notice: typeof search.notice === "string" ? search.notice : "",
  }),
  beforeLoad: async () => {
    clearPendingAuth();
    await redirectIfAuthenticated();
  },
  component: CustomerSignInPage,
});

function CustomerSignInPage() {
  const navigate = useNavigate();
  const { notice } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [signInAction, setSignInAction] = useState<"resend_confirmation" | "sign_up" | null>(null);
  const [busy, setBusy] = useState(false);
  const cloudProject = getSupabaseUrl();

  const signIn = () => {
    setError(null);
    setInfo(null);
    setSignInAction(null);
    setBusy(true);
    void loginUser({ email, password })
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          setSignInAction(result.signInAction ?? null);
          return;
        }
        navigate({ to: result.homePath });
      })
      .finally(() => setBusy(false));
  };

  const resendConfirmation = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setError("Enter your email above first.");
      return;
    }
    setBusy(true);
    setError(null);
    void resendSignupConfirmation({ data: { email: normalized } })
      .then(async (result) => {
        if (result.ok) {
          setInfo("Confirmation email sent. Check your inbox and spam folder.");
          return;
        }
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error: clientError } = await supabase.auth.resend({
            type: "signup",
            email: normalized,
          });
          if (!clientError) {
            setInfo("Confirmation email sent. Check your inbox and spam folder.");
            return;
          }
        }
        setError(result.error);
      })
      .finally(() => setBusy(false));
  };

  const forgotPassword = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setError("Enter your email above first.");
      return;
    }
    setBusy(true);
    setError(null);
    void requestPasswordReset(normalized)
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setInfo("Password reset email sent. Open the link, set a new password, then sign in here.");
      })
      .finally(() => setBusy(false));
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
                className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={forgotPassword}
              >
                Forgot your password?
              </button>
            </div>

            {notice ? (
              <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                {notice}
              </p>
            ) : null}

            {info ? (
              <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                {info}
              </p>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {signInAction === "resend_confirmation" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                disabled={busy}
                onClick={resendConfirmation}
              >
                Resend confirmation email
              </Button>
            ) : null}

            <Button
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={busy}
              onClick={signIn}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/customer/welcome" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>

            {import.meta.env.DEV && cloudProject ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Dev: signing in to {cloudProject.replace("https://", "")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </CustomerPageShell>
  );
}
