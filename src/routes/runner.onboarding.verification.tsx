import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, GraduationCap, Headset } from "lucide-react";
import { useEffect } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { Button } from "@/components/ui/button";
import { completeRunnerOnboardingPending, persistRunnerOnboardingStage } from "@/lib/runner-account";

export const Route = createFileRoute("/runner/onboarding/verification")({
  component: RunnerOnboardingVerificationPage,
});

function RunnerOnboardingVerificationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    persistRunnerOnboardingStage("verification");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary" />
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Notifications"
          onClick={() => window.alert("Notifications are simulated in this demo.")}
        >
          <Bell className="h-5 w-5 text-primary" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-5 py-8">
        <section className="rounded-xl border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold">Verification pending</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The Lotto Runners team is reviewing your profile photo, documents, vehicle details, payout information, and training acknowledgements.
          </p>
        </section>

        <RunnerOnboardingProgress current="verification" />

        <section className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your onboarding progress</h3>
          <div className="space-y-0">
            <TimelineStep title="Account created" subtitle="Email sign-up complete" state="done" showLine />
            <TimelineStep title="Services selected" subtitle="Your operating services are configured" state="done" showLine />
            <TimelineStep title="Documents uploaded" subtitle="Profile photo, ID, license, and insurance received" state="done" showLine />
            <TimelineStep title="Payout and training complete" subtitle="Banking details and runner standards confirmed" state="done" showLine />
            <TimelineStep title="Under review" subtitle="Team is validating your info" state="current" showLine />
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
        <div className="mx-auto w-full max-w-2xl">
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              completeRunnerOnboardingPending();
              navigate({ to: "/runner/dashboard" });
            }}
          >
            Go to runner home
          </Button>
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
  state: "done" | "current" | "upcoming";
  showLine: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <StepDot state={state} />
        {showLine ? <div className={`mt-1 h-10 w-0.5 ${state === "done" ? "bg-primary" : "bg-border"}`} /> : null}
      </div>
      <div className="pb-6 pt-0.5">
        <p className={`font-semibold ${state === "done" ? "text-primary" : state === "current" ? "text-foreground" : "text-muted-foreground"}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StepDot({ state }: { state: "done" | "current" | "upcoming" }) {
  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
        state === "done"
          ? "border-primary bg-primary text-primary-foreground"
          : state === "current"
            ? "border-primary bg-primary/15"
            : "border-border bg-secondary"
      }`}
    >
      {state === "done" ? <Check className="h-3.5 w-3.5" /> : state === "current" ? <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> : null}
    </div>
  );
}
