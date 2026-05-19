import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { BriefcaseBusiness, Car, Clock3, Truck, Venus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { formatWalletBalance } from "@/lib/customer-wallet";
import { useCustomerApp } from "@/lib/customer-store";

const RIDE_OPTIONS = [
  { id: "standard", label: "Standard Ride", eta: "3 min away", price: 45, oldPrice: 55, icon: Car },
  { id: "xl", label: "XL Ride", eta: "6 min away", price: 85, icon: Truck },
  { id: "women", label: "Women Only", eta: "5 min away", price: 50, icon: Venus },
  { id: "corporate", label: "Corporate Ride", eta: "8 min away", price: 120, icon: BriefcaseBusiness },
] as const;

export const Route = createFileRoute("/customer/choose-service")({
  component: CustomerChooseServicePage,
});

function CustomerChooseServicePage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { setStatus, setSelectedService, setRideSubType, ensureRoute, restoreHomeUi } = useCustomerApp();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<(typeof RIDE_OPTIONS)[number]["id"]>("standard");

  const selectedFare = useMemo(() => {
    return RIDE_OPTIONS.find((option) => option.id === selectedOption)?.price ?? 45;
  }, [selectedOption]);

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-36">
      <CustomerFlowHeader
        title="Lotto Runners"
        bleed
        onBack={() => {
          restoreHomeUi();
          goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }));
        }}
      />

      <section className="-mx-4 overflow-hidden border-y border-border bg-secondary sm:-mx-6">
        <div className="relative h-64 w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,oklch(0.9_0.05_250),transparent_40%),radial-gradient(circle_at_75%_70%,oklch(0.8_0.06_200),transparent_45%)]" />
          <div className="absolute inset-x-4 bottom-4 rounded-xl border bg-card/95 p-4 shadow">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pickup</p>
            <p className="font-semibold">Independence Ave, Windhoek</p>
            <div className="my-2 h-px bg-border" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Destination</p>
            <p className="font-semibold">Maerua Mall Entrance</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Choose a ride</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">4 options</span>
        </div>

        {RIDE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = selectedOption === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOption(option.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                active ? "border-primary bg-secondary shadow" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-3 ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.eta}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">N$ {option.price.toFixed(2)}</p>
                  {option.oldPrice ? (
                    <p className="text-xs text-muted-foreground line-through">N$ {option.oldPrice.toFixed(2)}</p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <CustomerFixedFooter width="md">
        <div className="flex flex-col gap-3">
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Wallet ({formatWalletBalance()})</span>
            </div>
            <span className="text-sm text-muted-foreground">Estimated total: N$ {selectedFare.toFixed(2)}</span>
          </div>
          <Button
            className="h-12 text-base"
            onClick={() => {
              setFormError(null);
              if (!selectedOption) {
                setFormError("Select a ride type.");
                return;
              }
              setRideSubType(selectedOption);
              setSelectedService("ride");
              ensureRoute();
              setStatus("estimating");
              navigate({ to: "/customer/review-schedule" });
            }}
          >
            Confirm Selection
            <Clock3 className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}
