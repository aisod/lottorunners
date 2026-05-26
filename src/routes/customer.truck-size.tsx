import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Truck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { cn } from "@/lib/utils";
import { getTruckSizeBaseNad } from "@/lib/services";
import { useCustomerApp } from "@/lib/customer-store";
import type { TruckSizeId } from "@/lib/types";

const TIERS: {
  id: TruckSizeId;
  title: string;
  description: string;
  capacity: string;
}[] = [
  {
    id: "small",
    title: "Small Bakkie",
    description: "Perfect for furniture, small appliances, or quick errand deliveries across town.",
    capacity: "Max capacity: 750 kg",
  },
  {
    id: "medium",
    title: "Medium Truck (3-Ton)",
    description: "Ideal for moving 1–2 bedroom apartments or heavy office equipment.",
    capacity: "Max capacity: 3000 kg",
  },
  {
    id: "large",
    title: "Large Truck (8-Ton+)",
    description: "Full house moves or heavy industrial logistics. Tail-lift available.",
    capacity: "Max capacity: 8000 kg+",
  },
];

export const Route = createFileRoute("/customer/truck-size")({
  component: CustomerTruckSizePage,
});

function CustomerTruckSizePage() {
  const navigate = useNavigate();
  const router = useRouter();
  const {
    truckSizeId,
    setTruckSizeId,
    selectedService,
    setSelectedService,
    setTruckLabour,
    restoreHomeUi,
  } = useCustomerApp();

  useEffect(() => {
    setTruckLabour(false);
  }, [setTruckLabour]);

  const tier = truckSizeId ?? "small";
  const subtotal = useMemo(() => getTruckSizeBaseNad()[tier], [tier]);

  return (
    <CustomerPageShell width="lg" variant="plain" className="pb-36">
      <CustomerFlowHeader
        title="Truck & moving"
        width="lg"
        bleed
        onBack={() => {
          restoreHomeUi();
          goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }));
        }}
      />

      <main className="space-y-6 py-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Select truck size</h2>
          <p className="mt-1 text-muted-foreground">Choose the best fit for your logistics needs.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {TIERS.map((t) => {
            const selected = tier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedService("truck");
                  setTruckSizeId(t.id);
                }}
                className={cn(
                  "relative flex gap-4 overflow-hidden rounded-xl border bg-card p-5 text-left shadow-sm transition hover:bg-secondary/30",
                  t.id === "large" && "lg:col-span-2",
                  selected ? "border-2 border-primary ring-2 ring-primary/15" : "border-border/80",
                )}
              >
                {selected ? <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-primary" /> : null}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Truck className={cn("h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
                    <h3 className="text-lg font-semibold">{t.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="mt-3 text-sm font-semibold text-primary">
                    Base fare: N$ {getTruckSizeBaseNad()[t.id].toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.capacity}</p>
                </div>
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-secondary/80">
                  <Truck className={cn("h-14 w-14", selected ? "text-primary" : "text-muted-foreground")} />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <CustomerFixedFooter width="lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Subtotal from <span className="font-semibold text-foreground">N$ {subtotal.toLocaleString()}</span>
            <span className="block text-xs">Distance is added on the next step.</span>
          </p>
          <Button
            className="h-12 gap-2 sm:min-w-[240px]"
            onClick={() => {
              if (!selectedService) setSelectedService("truck");
              navigate({ to: "/customer/moving-details" });
            }}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}
