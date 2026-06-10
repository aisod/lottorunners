import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, Car, CheckCircle2, Package, ShieldCheck, ShoppingBasket, Truck } from "lucide-react";
import { useMemo } from "react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { RoleSwitcher } from "@/components/role-switcher";
import { RunnerProfileAvatar } from "@/components/runner-profile-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RunnerRideCategoryPicker } from "@/components/runner-ride-category-picker";
import { runnerOffersTaxi, type RunnerOfferedServiceId, useRunnerSettings } from "@/lib/runner-settings";
import { getRunnerBankDetails, maskAccountNumber } from "@/lib/runner-workflow";

const SERVICES: {
  id: RunnerOfferedServiceId;
  title: string;
  description: string;
  icon: typeof Car;
}[] = [
  { id: "taxi", title: "Taxi", description: "Passenger trips.", icon: Car },
  { id: "delivery", title: "Delivery", description: "Packages and food.", icon: Package },
  { id: "errand", title: "Errand runner", description: "Shopping and light tasks.", icon: ShoppingBasket },
  { id: "truck", title: "Truck", description: "Heavy loads and moves.", icon: Truck },
];

export const Route = createFileRoute("/runner/settings")({
  component: RunnerSettingsPage,
});

function RunnerSettingsPage() {
  const selectedServiceIds = useRunnerSettings((s) => s.selectedServiceIds);
  const toggleOfferedService = useRunnerSettings((s) => s.toggleOfferedService);
  const selected = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);
  const bankDetails = getRunnerBankDetails();

  return (
    <div className="min-h-dvh bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/runner/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-primary">Runner settings</h1>
        </div>
        <Button variant="ghost" asChild className="h-9 px-3 text-sm font-semibold text-primary">
          <Link to="/logout">Sign out</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-5 py-6">
        <RoleSwitcher />
        <section className="rounded-3xl border bg-card p-5">
          <div className="flex items-center gap-4">
            <RunnerProfileAvatar size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Runner profile</p>
              <h2 className="mt-1 text-xl font-black">Lukas Shilongo</h2>
              <p className="text-sm text-muted-foreground">Windhoek Central • Verified runner account</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryPill label="Services active" value={`${selected.size}`} />
            <SummaryPill label="Payout status" value="Weekly Friday" />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Services you offer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Synced across devices. At least one service must stay on.</p>
          <div className="mt-4 space-y-2">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              const isOn = selected.has(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleOfferedService(svc.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition",
                    isOn ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", isOn ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{svc.title}</p>
                    <p className="text-xs text-muted-foreground">{svc.description}</p>
                  </div>
                  {isOn ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        {runnerOffersTaxi(selectedServiceIds) ? <RunnerRideCategoryPicker /> : null}

        <section className="rounded-3xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Verification &amp; documents</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage the documents and onboarding items tied to your runner account.</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryBox title="Verification" value="Approved" />
            <SummaryBox title="Vehicle" value="Toyota Hilux" />
            <SummaryBox title="Documents" value="Up to date" />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/runner/onboarding/vehicle">Vehicle</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/runner/onboarding/documents">Documents</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/runner/onboarding/verification">Verification</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Payout account</h2>
              <p className="mt-1 text-sm text-muted-foreground">Weekly runner payouts are sent to the bank account below.</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryBox title="Bank" value={bankDetails.bankName} />
            <SummaryBox title="Account" value={maskAccountNumber(bankDetails.accountNumber)} />
          </div>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/runner/payout-details">Update payout details</Link>
          </Button>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track performance, earnings, activity, and runner support.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runner/performance">Runner Performance</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runner/earnings">Runner Earnings</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runner/activity-history">Activity History</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runner/support-help">Support &amp; Help</Link>
            </Button>
          </div>
        </section>
      </main>

      <RunnerBottomNav active="account" />
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
