import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Box, FileText, HelpCircle, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerRouteStopsCard } from "@/components/customer-route-stops-card";
import { CustomerHeaderLogo } from "@/components/customer-header-logo";
import { CustomerFixedFooter, CustomerPageShell, CustomerStickyHeader } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { goBackOrFallback } from "@/lib/customer-navigation";
import type { RouteStop } from "@/lib/geocode-address";
import { resolveRouteStop } from "@/lib/geocode-address";
import { validateDeliveryStep } from "@/lib/booking-validation";
import { useCustomerApp } from "@/lib/customer-store";
import { notifyUnavailable } from "@/lib/user-feedback";

export const Route = createFileRoute("/customer/delivery-request")({
  component: CustomerDeliveryRequestPage,
});

function CustomerDeliveryRequestPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const {
    pickup,
    destination,
    setPickup,
    setDestination,
    setSelectedService,
    setStatus,
    setScheduleMode,
    setErrandDescription,
    userLocation,
  } = useCustomerApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pickupDraft, setPickupDraft] = useState<RouteStop | null>(pickup);
  const [destinationDraft, setDestinationDraft] = useState<RouteStop | null>(destination);
  const [packageSize, setPackageSize] = useState<"document" | "small_box" | "medium_box">("document");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    setScheduleMode("now");
  }, [setScheduleMode]);

  useEffect(() => {
    setPickupDraft((prev) => prev ?? pickup);
  }, [pickup]);

  useEffect(() => {
    setDestinationDraft((prev) => prev ?? destination);
  }, [destination]);

  const pickupLabel = pickupDraft?.label ?? pickup?.label ?? "Set pickup location";
  const destinationLabel = destinationDraft?.label ?? destination?.label ?? "Set destination location";

  const submit = async () => {
    const validation = validateDeliveryStep(pickupDraft, destinationDraft, instructions);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const pickupResolved = await resolveRouteStop(pickupDraft, pickupLabel, userLocation);
      const destinationResolved = await resolveRouteStop(destinationDraft, destinationLabel, userLocation);

      const nextErrors: Record<string, string> = {};
      if (!pickupResolved) {
        nextErrors.pickup = "Could not find pickup location. Pick a search result or refine the address.";
      }
      if (!destinationResolved) {
        nextErrors.dropoff = "Could not find delivery destination. Pick a search result or refine the address.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }

      setErrandDescription(instructions);
      setPickup(pickupResolved!);
      setDestination(destinationResolved!);
      setSelectedService("delivery");
      setScheduleMode("now");
      setStatus("estimating");
      navigate({ to: "/customer/review-schedule" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-28">
      <CustomerStickyHeader width="md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-primary">New Delivery</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Help"
            onClick={() =>
              notifyUnavailable(
                "Enter pickup and drop-off addresses (search or map), choose package size, then continue to review and confirm your booking.",
              )
            }
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <CustomerHeaderLogo size="sm" />
        </div>
      </CustomerStickyHeader>

      <main className="space-y-6 py-6">
        <section className="space-y-2">
          <CustomerRouteStopsCard
            near={userLocation}
            pickupLabel={pickupLabel}
            destinationLabel={destinationLabel}
            onPickPickup={(r) => setPickupDraft({ label: r.shortLabel, coord: r.coord })}
            onPickDestination={(r) => setDestinationDraft({ label: r.shortLabel, coord: r.coord })}
          />
          {errors.pickup ? <p className="text-sm text-destructive">{errors.pickup}</p> : null}
          {errors.dropoff ? <p className="text-sm text-destructive">{errors.dropoff}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Package Size</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <PackageCard
              label="Document"
              active={packageSize === "document"}
              onClick={() => setPackageSize("document")}
              icon={<FileText className="h-7 w-7" />}
            />
            <PackageCard
              label="Small Box"
              active={packageSize === "small_box"}
              onClick={() => setPackageSize("small_box")}
              icon={<Box className="h-7 w-7" />}
            />
            <PackageCard
              label="Medium Box"
              active={packageSize === "medium_box"}
              onClick={() => setPackageSize("medium_box")}
              icon={<Package className="h-7 w-7" />}
            />
          </div>
        </section>

        <section className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Special Delivery Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Gate code, floor number, or specific delivery handling instructions..."
            className="min-h-24 w-full rounded-xl border bg-card p-4 text-sm outline-none"
          />
          {errors.parcel ? <p className="text-sm text-destructive">{errors.parcel}</p> : null}
        </section>
      </main>

      <CustomerFixedFooter width="md">
        {Object.keys(errors).length > 0 && !errors.pickup && !errors.dropoff && !errors.parcel ? (
          <p className="mb-2 text-sm text-destructive">{Object.values(errors)[0]}</p>
        ) : null}
        <Button className="h-12 w-full text-base font-bold" onClick={submit} disabled={submitting}>
          {submitting ? "Locating addresses…" : "Estimate Delivery"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Transparent pricing. No hidden fees.</p>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}

function PackageCard({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition ${
        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"
      }`}
    >
      <div className="text-primary">{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
