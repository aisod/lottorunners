import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeDollarSign, ChevronRight, Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { Button } from "@/components/ui/button";
import { saveRunnerBankDetails } from "@/lib/runner-workflow";
import { persistRunnerOnboardingStage } from "@/lib/runner-account";

export const Route = createFileRoute("/runner/onboarding/banking")({
  component: RunnerOnboardingBankingPage,
});

function RunnerOnboardingBankingPage() {
  const navigate = useNavigate();
  const [bankName, setBankName] = useState("Bank Windhoek");
  const [accountHolder, setAccountHolder] = useState("Lukas Shilongo");
  const [accountNumber, setAccountNumber] = useState("0145589021");
  const [branchCode, setBranchCode] = useState("482172");

  const canContinue = Boolean(
    bankName.trim() &&
      accountHolder.trim() &&
      accountNumber.trim() &&
      branchCode.trim(),
  );

  return (
    <div className="min-h-dvh bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/runner/onboarding/vehicle" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </div>
        <div className="h-9 w-9 rounded-full bg-secondary" />
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        <div>
          <h2 className="text-2xl font-bold">Payout account details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the bank account Lotto Runners will use for weekly payouts and bonus transfers.
          </p>
        </div>

        <RunnerOnboardingProgress current="banking" />

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-4">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Weekly payout schedule</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved runners receive automatic weekly payouts every Friday, with a full payout history visible in earnings.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Bank name">
              <select
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                className="h-12 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
              >
                <option>Bank Windhoek</option>
                <option>FNB Namibia</option>
                <option>Standard Bank Namibia</option>
                <option>Nedbank Namibia</option>
              </select>
            </Field>

            <Field label="Branch code">
              <input
                value={branchCode}
                onChange={(event) => setBranchCode(event.target.value)}
                placeholder="Enter branch code"
                className="h-12 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
              />
            </Field>

            <Field label="Account holder">
              <input
                value={accountHolder}
                onChange={(event) => setAccountHolder(event.target.value)}
                placeholder="Full account holder name"
                className="h-12 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
              />
            </Field>

            <Field label="Account number">
              <input
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="Account number"
                className="h-12 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Payout security</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Double-check your account details before submission. Incorrect details can delay Friday payouts.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border bg-secondary/30 p-4">
            <div className="rounded-full bg-background p-2 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Bank statement or confirmation letter</p>
              <p className="text-xs text-muted-foreground">
                Bring this if support requests payout verification later.
              </p>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            className="h-12 w-full gap-2 text-base"
            disabled={!canContinue}
            onClick={() => {
              saveRunnerBankDetails({
                bankName,
                accountHolder,
                accountNumber,
                branchCode,
              });
              persistRunnerOnboardingStage("training");
              navigate({ to: "/runner/onboarding/training" });
            }}
          >
            Continue to training
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}
