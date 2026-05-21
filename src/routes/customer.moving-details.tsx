import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Truck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CargoPhotoSlots } from "@/components/cargo-photo-slots";
import { CustomerRouteStopsCard } from "@/components/customer-route-stops-card";
import type { CargoPhotoSlotId } from "@/lib/cargo-photos";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { validateMovingStep } from "@/lib/booking-validation";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/moving-details")({
  component: CustomerMovingDetailsPage,
});

function CustomerMovingDetailsPage() {
  const navigate = useNavigate();
  const {
    movingNotes,
    setMovingNotes,
    cargoPhotos,
    setCargoPhoto,
    truckExtraHelpers,
    setTruckExtraHelpers,
    pickup,
    destination,
    setPickup,
    setDestination,
    userLocation,
    setStatus,
    setSelectedService,
    setScheduleMode,
  } = useCustomerApp();

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setScheduleMode("now");
  }, [setScheduleMode]);

  const submit = () => {
    const result = validateMovingStep(useCustomerApp.getState());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSelectedService("truck");
    setScheduleMode("now");
    setStatus("estimating");
    navigate({ to: "/customer/review-schedule" });
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-32">
      <CustomerFlowHeader title="Truck request" bleed onBack={() => navigate({ to: "/customer/truck-size" })} />

      <main className="space-y-6 pb-8 pt-6">
        <section className="rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
          <h2 className="text-xl font-semibold">Heavy cargo logistics</h2>
          <p className="mt-1 text-sm opacity-90">
            Accurate details help us dispatch the right vehicle and equipment. You can refine pickup and drop-off on the home map anytime.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Route details</h3>
          <CustomerRouteStopsCard
            near={userLocation}
            pickupLabel={pickup?.label ?? "Set pickup location"}
            destinationLabel={destination?.label ?? "Set destination location"}
            onPickPickup={(r) => setPickup({ label: r.shortLabel, coord: r.coord })}
            onPickDestination={(r) => setDestination({ label: r.shortLabel, coord: r.coord })}
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-end justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cargo description</h3>
            <span className="text-xs text-muted-foreground">Max 500 chars</span>
          </div>
          <textarea
            value={movingNotes}
            onChange={(e) => setMovingNotes(e.target.value.slice(0, 500))}
            placeholder="Describe items (e.g. 3× double beds, industrial fridge, building materials…)"
            className="min-h-[120px] w-full rounded-xl border bg-card p-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item photos</h3>
          <CargoPhotoSlots
            photos={cargoPhotos}
            onChange={(slot: CargoPhotoSlotId, url) => setCargoPhoto(slot, url)}
          />
          <p className="text-xs text-muted-foreground">
            Optional. Uploads are saved to your account and attached to the job for the crew. Sign in if upload fails.
          </p>
        </section>

        <section className="flex items-center justify-between rounded-xl border bg-secondary/40 p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Need extra helpers?</p>
              <p className="text-xs text-muted-foreground">Request up to 2 additional loaders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setTruckExtraHelpers(truckExtraHelpers - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{truckExtraHelpers}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setTruckExtraHelpers(truckExtraHelpers + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {Object.keys(errors).length > 0 ? (
          <p className="text-sm text-destructive">{Object.values(errors)[0]}</p>
        ) : null}
        <Button className="h-14 w-full gap-2 text-base" onClick={submit}>
          <Truck className="h-5 w-5" />
          Estimate price &amp; request
        </Button>
      </main>
    </CustomerPageShell>
  );
}
