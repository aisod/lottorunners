import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, GraduationCap, Headset, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { Button } from "@/components/ui/button";
import {
  getRunnerOnboardingStatus,
  persistRunnerOnboardingStage,
  submitRunnerForVerification,
} from "@/lib/runner-account";

export const Route = createFileRoute("/runner/onboarding/verification")({
  component: RunnerOnboardingVerificationPage,
});

function RunnerOnboardingVerificationPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(getRunnerOnboardingStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    persistRunnerOnboardingStage("verification");
  }, []);

  useEffect(() => {
    if (status === "approved") {
      navigate({ to: "/runner/dashboard", replace: true });
    }
  }, [navigate, status]);

  const handleSubmitForReview = () => {
    setError(null);
    setSubmitting(true);
    void submitRunnerForVerification().then((result) => {
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus("pending_verification");
    });
  };

  const isPending = status === "pending_verification";
  const isRejected = status === "rejected";

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <motion.div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary" />
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Notifications"
          disabled
          title="Notifications are not available yet"
        >
          <Bell className="h-5 w-5 text-primary opacity-50" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-5 py-8">
        <section
          className={`rounded-xl border bg-card p-6 text-center ${
            isRejected ? "border-destructive/30 bg-destructive/5" : ""
          }`}
        >
          <div
            className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
              isRejected ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            {isRejected ? <XCircle className="h-12 w-12" /> : <GraduationCap className="h-12 w-12" />}
          </div>
          <h2 className="text-2xl font-bold">
            {isRejected
              ? "Application not approved"
              : isPending
                ? "Verification pending"
                : "Ready to submit for review"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {isRejected
              ? "Your runner application was not approved. Contact support if you believe this is a mistake or would like to reapply with updated documents."
              : isPending
                ? "The Lotto Runners team is reviewing your profile photo, documents, vehicle details, payout information, and training acknowledgements. You will be notified once a decision is made."
                : "When you are finished with onboarding, submit your profile for admin review. You cannot go online or accept jobs until you are approved."}
          </p>
        </section>

        <RunnerOnboardingProgress current="verification" />

        <section className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your onboarding progress
          </h3>
          <div className="space-y-0">
            <TimelineStep title="Account created" subtitle="Email sign-up complete" state="done" showLine />
            <TimelineStep title="Services selected" subtitle="Your operating services are configured" state="done" showLine />
            <TimelineStep
              title="Documents uploaded"
              subtitle="Profile photo, ID, license, and insurance received"
              state="done"
              showLine
            />
            <TimelineStep
              title="Payout and training complete"
              subtitle="Banking details and runner standards confirmed"
              state="done"
              showLine
            />
            <TimelineStep
              title={isRejected ? "Not approved" : "Under review"}
              subtitle={
                isRejected
                  ? "Please contact runner support"
                  : isPending
                    ? "Team is validating your info"
                    : "Submit when you are ready"
              }
              state={isRejected ? "rejected" : isPending ? "current" : "upcoming"}
              showLine
            />
            <TimelineStep title="Active" subtitle="Ready to start running" state="upcoming" showLine={false} />
          </div>
        </section>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Need help or have questions?</p>
          <Link to="/runner/support-help" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Headset className="h-4 w-4" />
            Contact runner support
          </Link>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
          {isPending || isRejected ? (
            <Button className="h-12 w-full text-base" variant="outline" disabled>
              {isPending ? "Submitted — awaiting review" : "Application rejected"}
            </Button>
          ) : (
            <Button className="h-12 w-full text-base" disabled={submitting} onClick={handleSubmitForReview}>
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  title,
  subtitle,
  state,
  showLine,
}: {
  title: string;
  subtitle: string;
  state: "done" | "current" | "upcoming" | "rejected";
  showLine: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <StepDot state={state} />
        {showLine ? (
          <motion.div
            className={`mt-1 h-10 w-0.5 ${state === "done" ? "bg-primary" : state === "rejected" ? "bg-destructive" : "bg-border"}`}
          />
        ) : null}
      </div>
      <div className="pb-6 pt-0.5">
        <p
          className={`font-semibold ${
            state === "done"
              ? "text-primary"
              : state === "current"
                ? "text-foreground"
                : state === "rejected"
                  ? "text-destructive"
                  : "text-muted-foreground"
          }`}
        >
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StepDot({ state }: { state: "done" | "current" | "upcoming" | "rejected" }) {
  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
        state === "done"
          ? "border-primary bg-primary text-primary-foreground"
          : state === "current"
            ? "border-primary bg-primary/15"
            : state === "rejected"
              ? "border-destructive bg-destructive/15"
              : "border-border bg-secondary"
      }`}
    >
      {state === "done" ? (
        <Check className="h-3.5 w-3.5" />
      ) : state === "current" ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      ) : state === "rejected" ? (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      ) : null}
    </div>
  );
}
