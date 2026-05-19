import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ListTodo, ShoppingBasket, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { validateErrandDetailsStep } from "@/lib/booking-validation";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/errand-details")({
  component: CustomerErrandDetailsPage,
});

function CustomerErrandDetailsPage() {
  const navigate = useNavigate();
  const router = useRouter();
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
    setSelectedService,
    restoreHomeUi,
  } = useCustomerApp();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const cat = errandCategory ? ERRAND_CATEGORIES[errandCategory] : null;

  useEffect(() => {
    if (!errandCategory || !cat) {
      navigate({ to: "/customer/choose-errand-type", replace: true });
    }
  }, [errandCategory, cat, navigate]);

  const goBack = () => {
    restoreHomeUi();
    goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }));
  };

  if (!errandCategory || !cat) {
    return (
      <CustomerPageShell width="md" variant="plain">
        <CustomerFlowHeader title="Errand Services" onBack={goBack} />
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading errand details…</p>
        </div>
      </CustomerPageShell>
    );
  }

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-28">
      <CustomerFlowHeader title="Errand Services" onBack={goBack} />

      <main className="space-y-5 py-5">
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{cat.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <label className="block text-sm font-semibold">Store preference (optional)</label>
          <div className="relative">
            <Store className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={storePreference}
              onChange={(event) => setStorePreference(event.target.value)}
              className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none ring-primary/30 transition focus:ring"
              placeholder="e.g., Woermann Brock, Spar"
            />
          </div>

          <label className="block pt-1 text-sm font-semibold">Task details</label>
          <div className="relative">
            <ListTodo className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <textarea
              value={errandDescription}
              onChange={(event) => setErrandDescription(event.target.value)}
              className="min-h-28 w-full rounded-lg border bg-background pl-10 pr-3 pt-3 text-sm outline-none ring-primary/30 transition focus:ring"
              placeholder={cat.detailsPlaceholder}
            />
          </div>
          {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}

          <label className="block pt-1 text-sm font-semibold">Budget estimate (N$)</label>
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
          {errors.budget ? <p className="text-sm text-destructive">{errors.budget}</p> : null}

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
        {Object.keys(errors).length > 0 && !errors.description && !errors.budget ? (
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
