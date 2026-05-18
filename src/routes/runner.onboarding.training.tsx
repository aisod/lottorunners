import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, GraduationCap, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { Button } from "@/components/ui/button";
import { persistRunnerOnboardingStage } from "@/lib/runner-account";

export const Route = createFileRoute("/runner/onboarding/training")({
  component: RunnerOnboardingTrainingPage,
});

function RunnerOnboardingTrainingPage() {
  const navigate = useNavigate();
  const [serviceStandardsAccepted, setServiceStandardsAccepted] = useState(false);
  const [backgroundConsentAccepted, setBackgroundConsentAccepted] = useState(false);

  const canContinue = serviceStandardsAccepted && backgroundConsentAccepted;

  return (
    <div className="min-h-dvh bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/runner/onboarding/banking" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </div>
        <div className="h-9 w-9 rounded-full bg-secondary" />
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
        <div>
          <h2 className="text-2xl font-bold">Training &amp; activation checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the key runner standards before your account moves to final verification.
          </p>
        </div>

        <RunnerOnboardingProgress current="training" />

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Service standards</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every runner must maintain a professional handover, communicate clearly, and keep customer items secure throughout the trip.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <TipCard title="Arrival etiquette" body="Send a quick arrival message and confirm handover details before collecting items." />
            <TipCard title="Proof of completion" body="Capture clear proof photos or receipts whenever the task requires a documented handover." />
            <TipCard title="Customer safety" body="Follow secure delivery rules, never share customer data, and escalate any dispute to support." />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Verification acknowledgements</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Lotto Runners may review your onboarding documents and conduct a background verification before activation.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ConsentRow
              checked={serviceStandardsAccepted}
              onChange={setServiceStandardsAccepted}
              label="I understand the Lotto Runners service standards and will follow the required conduct on every trip."
            />
            <ConsentRow
              checked={backgroundConsentAccepted}
              onChange={setBackgroundConsentAccepted}
              label="I consent to identity and background verification before I start accepting runner jobs."
            />
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <Button
            className="h-12 w-full text-base"
            disabled={!canContinue}
            onClick={() => {
              persistRunnerOnboardingStage("verification");
              navigate({ to: "/runner/onboarding/verification" });
            }}
          >
            Submit for verification
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-background p-1.5 text-primary">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border bg-secondary/20 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
