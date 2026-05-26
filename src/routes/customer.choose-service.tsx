import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { BriefcaseBusiness, Car, Clock3, Truck, Venus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerRouteStopsCard, CustomerRouteStopsHeroSection } from "@/components/customer-route-stops-card";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { formatWalletBalance } from "@/lib/customer-wallet";
import type { RouteStop } from "@/lib/geocode-address";
import { isValidRouteStop, resolveRouteStop } from "@/lib/geocode-address";
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
  const {
    setStatus,
    setSelectedService,
    setRideSubType,
    setPickup,
    setDestination,
    pickup,
    destination,
    userLocation,
    restoreHomeUi,
  } = useCustomerApp();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<(typeof RIDE_OPTIONS)[number]["id"]>("standard");
  const [pickupDraft, setPickupDraft] = useState<RouteStop | null>(pickup);
  const [destinationDraft, setDestinationDraft] = useState<RouteStop | null>(destination);

  const selectedFare = useMemo(() => {
    return RIDE_OPTIONS.find((option) => option.id === selectedOption)?.price ?? 45;
  }, [selectedOption]);

  const pickupLabel = pickupDraft?.label ?? pickup?.label ?? "Set pickup location";
  const destinationLabel = destinationDraft?.label ?? destination?.label ?? "Set destination location";

  const confirm = async () => {
    setFormError(null);
    if (!selectedOption) {
      setFormError("Select a ride type.");
      return;
    }

    setSubmitting(true);
    try {
      const resolvedPickup = await resolveRouteStop(pickupDraft ?? pickup, pickupLabel, userLocation);
      const resolvedDestination = await resolveRouteStop(
        destinationDraft ?? destination,
        destinationLabel,
        userLocation,
      );

      if (!isValidRouteStop(resolvedPickup)) {
        setFormError("Set a pickup location using search or the home map.");
        return;
      }
      if (!isValidRouteStop(resolvedDestination)) {
        setFormError("Set a destination using search or the home map.");
        return;
      }

      setPickup(resolvedPickup!);
      setDestination(resolvedDestination!);
      setRideSubType(selectedOption);
      setSelectedService("ride");
      setStatus("estimating");
      navigate({ to: "/customer/review-schedule" });
    } finally {
      setSubmitting(false);
    }
  };

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

      <CustomerRouteStopsHeroSection>
        <CustomerRouteStopsCard
          near={userLocation}
          pickupLabel={pickupLabel}
          destinationLabel={destinationLabel}
          onPickPickup={(r) => setPickupDraft({ label: r.shortLabel, coord: r.coord })}
          onPickDestination={(r) => setDestinationDraft({ label: r.shortLabel, coord: r.coord })}
        />
      </CustomerRouteStopsHeroSection>

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
                  {"oldPrice" in option && option.oldPrice ? (
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
          <Button className="h-12 text-base" onClick={confirm} disabled={submitting}>
            {submitting ? "Confirming locations…" : "Confirm Selection"}
            <Clock3 className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}
