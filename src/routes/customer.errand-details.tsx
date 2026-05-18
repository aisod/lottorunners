import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListTodo, ShoppingBasket, Store, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { validateErrandDetailsStep } from "@/lib/booking-validation";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/errand-details")({
  component: CustomerErrandDetailsPage,
});

function CustomerErrandDetailsPage() {
  const navigate = useNavigate();
  const {
    errandCategory,
    errandDescription,
    setErrandDescription,
    storePreference,
    setStorePreference,
    basketValue,
    setBasketValue,
    durationMin,
    setDurationMin,
    setStatus,
    ensureRoute,
    setSelectedService,
  } = useCustomerApp();

  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cat = errandCategory ? ERRAND_CATEGORIES[errandCategory] : null;

  useEffect(() => {
    if (!errandCategory) {
      navigate({ to: "/customer/choose-errand-type", replace: true });
    }
  }, [errandCategory, navigate]);

  if (!errandCategory || !cat) {
    return (
      <CustomerPageShell width="md" variant="plain">
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading errand details…</p>
        </div>
      </CustomerPageShell>
    );
  }

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-28">
      <CustomerFlowHeader title="Errand Services" bleed onBack={() => navigate({ to: "/customer/choose-errand-type" })} />

      <main className="space-y-5 py-5">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="h-44 bg-[linear-gradient(135deg,oklch(0.92_0.04_258),oklch(0.72_0.14_258))] p-5 text-primary-foreground">
            <p className="text-sm font-medium opacity-90">Errand Runner</p>
            <h2 className="mt-1 text-2xl font-bold">{cat.label}</h2>
            <p className="mt-2 max-w-sm text-sm opacity-90">{cat.tagline}. Add specifics below so a runner can quote and complete the job.</p>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <label className="block text-sm font-semibold">Store Preference</label>
          <div className="relative">
            <Store className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={storePreference}
              onChange={(event) => setStorePreference(event.target.value)}
              className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none ring-primary/30 transition focus:ring"
              placeholder="e.g., Woermann Brock, Spar"
            />
          </div>

          <label className="block pt-1 text-sm font-semibold">Shopping List</label>
          <div className="relative">
            <ListTodo className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <textarea
              value={errandDescription}
              onChange={(event) => setErrandDescription(event.target.value)}
              className="min-h-28 w-full rounded-lg border bg-background pl-10 pr-3 pt-3 text-sm outline-none ring-primary/30 transition focus:ring"
              placeholder={cat.detailsPlaceholder}
            />
          </div>

          <label className="block pt-1 text-sm font-semibold">Urgency</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUrgency("normal")}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${urgency === "normal" ? "border-primary bg-secondary text-primary" : "border-border"}`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setUrgency("urgent")}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${urgency === "urgent" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}
            >
              <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" /> Urgent</span>
            </button>
          </div>

          <label className="block pt-1 text-sm font-semibold">Budget Estimate (N$)</label>
          <div className="relative">
            <ShoppingBasket className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              min={0}
              value={basketValue || ""}
              onChange={(event) => setBasketValue(Number(event.target.value) || 0)}
              className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none ring-primary/30 transition focus:ring"
              placeholder="0.00"
            />
          </div>

          <label className="block pt-1 text-sm font-semibold">Expected duration (minutes)</label>
          <input
            type="number"
            min={10}
            step={5}
            value={durationMin}
            onChange={(event) => setDurationMin(Number(event.target.value) || 30)}
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-primary/30 transition focus:ring"
          />
        </section>
      </main>

      <CustomerFixedFooter width="md">
        {Object.keys(errors).length > 0 ? (
          <p className="mb-2 text-sm text-destructive">{Object.values(errors)[0]}</p>
        ) : null}
        <Button
          className="h-12 w-full text-base"
          onClick={() => {
            const result = validateErrandDetailsStep(useCustomerApp.getState());
            if (!result.ok) {
              setErrors(result.errors);
              return;
            }
            setErrors({});
            setSelectedService("errand");
            ensureRoute();
            setStatus("estimating");
            navigate({ to: "/customer/review-schedule" });
          }}
        >
          Review Request
        </Button>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}
