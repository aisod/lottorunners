import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Car, CheckCircle2, Info, Package, ShoppingBasket, Truck } from "lucide-react";
import { useMemo } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { Button } from "@/components/ui/button";
import { persistRunnerOnboardingStage } from "@/lib/runner-account";
import { getStoredRunnerStage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { type RunnerOfferedServiceId, useRunnerSettings } from "@/lib/runner-settings";

type ServiceId = RunnerOfferedServiceId;

const SERVICES: {
  id: ServiceId;
  title: string;
  description: string;
  badge: string;
  footnote: string;
  icon: typeof Car;
}[] = [
  {
    id: "taxi",
    title: "Taxi",
    description: "Safe, reliable passenger trips across the city.",
    badge: "High demand",
    footnote: "Vehicle required",
    icon: Car,
  },
  {
    id: "delivery",
    title: "Delivery",
    description: "Food, groceries, and small packages to the door.",
    badge: "Fast paced",
    footnote: "Bike or car",
    icon: Package,
  },
  {
    id: "errand",
    title: "Errand runner",
    description: "Shopping, pharmacy pickups, and light tasks.",
    badge: "Flexible",
    footnote: "On foot / any",
    icon: ShoppingBasket,
  },
  {
    id: "truck",
    title: "Truck",
    description: "Heavy items, moves, and large logistics.",
    badge: "Premium pay",
    footnote: "Truck / bakkie",
    icon: Truck,
  },
];

export const Route = createFileRoute("/runner/service-selection")({
  component: RunnerServiceSelectionPage,
});

function RunnerServiceSelectionPage() {
  const navigate = useNavigate();
  const runnerStage = getStoredRunnerStage();
  const selectedServiceIds = useRunnerSettings((s) => s.selectedServiceIds);
  const toggleOfferedService = useRunnerSettings((s) => s.toggleOfferedService);
  const selected = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);

  const count = selected.size;
  const summary = useMemo(() => `${count} service${count === 1 ? "" : "s"} selected`, [count]);

  return (
    <div className="min-h-dvh bg-background pb-32">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/logout" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-extrabold text-primary">Runner setup</h1>
        </div>
        <div className="h-9 w-9 rounded-full bg-secondary" />
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold">Choose your services</h2>
          <p className="mt-2 text-sm text-muted-foreground md:max-w-2xl">
            Select the services you will offer on the Lotto Runners network. You can adjust them later from your account area.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <RunnerOnboardingProgress current="service-selection" />
          <span className="text-sm font-semibold text-primary">Step 1: Services and operating scope</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const isSelected = selected.has(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleOfferedService(service.id)}
                className={cn(
                  "relative rounded-xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md",
                  isSelected && "border-2 border-primary ring-2 ring-primary/15",
                )}
              >
                {isSelected ? (
                  <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-primary" />
                ) : null}
                <div className={cn("mb-3 flex h-14 w-14 items-center justify-center rounded-full", isSelected ? "bg-primary/15" : "bg-secondary")}>
                  <Icon className={cn("h-7 w-7", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <h3 className="text-lg font-bold">{service.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs font-semibold uppercase tracking-wide">
                  <span className="text-muted-foreground">{service.badge}</span>
                  <span>{service.footnote}</span>
                </div>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl border bg-secondary/40 p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-primary" />
            Requirements for Namibian runners
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Valid Namibian ID or work permit</li>
            <li>Clean driving record (for taxi, delivery, truck)</li>
            <li>Proof of vehicle insurance</li>
          </ul>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="font-semibold">{summary}</p>
            <p className="text-xs text-muted-foreground">At least one service is required before you can continue.</p>
          </div>
          <Button
            className="h-12 gap-2 md:w-auto"
            onClick={() => {
              persistRunnerOnboardingStage("documents");
              navigate({ to: "/runner/onboarding/documents" });
            }}
          >
            Continue to documents
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
