import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import { AuthField } from "@/components/auth-field";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import { requestPasswordReset } from "@/lib/auth-users";

export const Route = createFileRoute("/customer/forgot-password")({
  beforeLoad: () => {
    if (!canRunClientAuthGuard()) return;
  },
  component: CustomerForgotPasswordPage,
});

function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sendResetLink = () => {
    setError(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }

    setSending(true);
    void requestPasswordReset(trimmed).then((result) => {
      setSending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        "If an account exists for this email address, a password reset link has been sent. Please check your inbox.",
      );
    });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="flex flex-col px-2 py-4 sm:px-4">
        <div className="w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_8px_40px_-12px_oklch(0.35_0.08_258/0.18)]">
          <div className="space-y-5 px-5 pb-6 pt-6 sm:px-6">
            <div className="text-center">
              <img src={logo} alt="Lotto Runners" className="mx-auto h-20 w-20 object-contain" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Forgot your password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email and we’ll send a reset link.
              </p>
            </div>

            <div className="space-y-3">
              <AuthField
                id="forgot-password-email"
                icon={Mail}
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {successMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
                {successMessage}
              </p>
            ) : null}

            <Button
              className="h-12 w-full rounded-xl text-base font-semibold"
              onClick={sendResetLink}
              disabled={sending}
            >
              Send Reset Link
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
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

