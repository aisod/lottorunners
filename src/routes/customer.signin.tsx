import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import { ensureSupabaseAuthSession, isCloudAuthAbsent } from "@/lib/auth/ensure-session";
import { clearAuthSession, clearPendingAuth, getAuthSession } from "@/lib/auth-session";
import { loginUser, requestPasswordReset } from "@/lib/auth-users";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRoleHomePath } from "@/lib/store";

export const Route = createFileRoute("/customer/signin")({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: typeof search.reason === "string" ? search.reason : undefined,
    role: typeof search.role === "string" ? search.role : undefined,
    reset: search.reset === "success" ? ("success" as const) : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (!canRunClientAuthGuard()) return;

    clearPendingAuth();

    // Only clear lr-auth when cloud tokens are truly gone (JWT may still be refreshing after reload).
    if (search.reason === "session_expired" && (await isCloudAuthAbsent())) {
      clearAuthSession();
      return;
    }

    const session = getAuthSession();
    if (!session) return;

    if (isSupabaseConfigured()) {
      const authed = await ensureSupabaseAuthSession();
      if (!authed) {
        clearAuthSession();
        return;
      }
    }

    throw redirect({ to: getRoleHomePath(session.activeRole) });
  },
  component: CustomerSignInPage,
});

function CustomerSignInPage() {
  const navigate = useNavigate();
  const { reason, reset } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);
  const sessionNotice =
    reason === "session_expired"
      ? "Your server session expired. Sign in again to accept jobs and share live location."
      : reset === "success"
        ? "Your password was updated. Sign in with your new password."
        : null;

  const sendPasswordReset = () => {
    setError(null);
    setResetMessage(null);
    setResetSending(true);
    void requestPasswordReset(email).then((result) => {
      setResetSending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResetMessage(
        "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.",
      );
    });
  };

  const signIn = () => {
    setError(null);
    setResetMessage(null);
    void loginUser({ email, password }).then((result) => {
      if (!result.ok) {
        setError(result.error);
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
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue with Lotto Runners</p>
            </div>

            {sessionNotice ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                {sessionNotice}
              </p>
            ) : null}

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
                className="text-sm font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={resetSending}
                onClick={sendPasswordReset}
              >
                {resetSending ? "Sending reset link…" : "Forgot your password?"}
              </button>
            </div>

            {resetMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
                {resetMessage}
              </p>
            ) : null}

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
