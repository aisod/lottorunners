import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import { completePasswordReset } from "@/lib/auth-users";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const Route = createFileRoute("/customer/reset-password")({
  beforeLoad: () => {
    if (!canRunClientAuthGuard()) return;
  },
  component: CustomerResetPasswordPage,
});

function CustomerResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCheckingSession(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;

    const checkSession = () => {
      void supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSessionReady(Boolean(data.session?.access_token));
        setCheckingSession(false);
      });
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.access_token) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const savePassword = () => {
    setError(null);
    void completePasswordReset({ password, confirmPassword }).then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate({ to: "/customer/signin", search: { reset: "success" } });
    });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col px-2 py-4 sm:px-4">
        <div className="w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_8px_40px_-12px_oklch(0.35_0.08_258/0.18)]">
          <div className="space-y-5 px-5 pb-6 pt-6 sm:px-6">
            <div className="text-center">
              <img src={logo} alt="Lotto Runners" className="mx-auto h-20 w-20 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Set a new password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Choose a new password for your Lotto Runners account.
              </p>
            </div>

            {checkingSession ? (
              <p className="text-center text-sm text-muted-foreground">Verifying reset link…</p>
            ) : !sessionReady ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                <p>This reset link is invalid or has expired.</p>
                <p>
                  <Link to="/customer/signin" className="font-semibold text-primary hover:underline">
                    Request a new reset email
                  </Link>{" "}
                  from the sign-in page.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <AuthField
                    id="reset-password"
                    icon={Lock}
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <AuthField
                    id="reset-confirm-password"
                    icon={Lock}
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={savePassword}>
                  Update password
                </Button>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/customer/signin" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </CustomerPageShell>
  );
}
