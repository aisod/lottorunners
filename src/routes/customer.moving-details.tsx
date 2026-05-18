import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bolt,
  CalendarDays,
  Camera,
  Flag,
  MapPin,
  Minus,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { validateMovingStep } from "@/lib/booking-validation";
import { useCustomerApp } from "@/lib/customer-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/moving-details")({
  component: CustomerMovingDetailsPage,
});

function CustomerMovingDetailsPage() {
  const navigate = useNavigate();
  const {
    movingNotes,
    setMovingNotes,
    truckExtraHelpers,
    setTruckExtraHelpers,
    pickup,
    destination,
    ensureRoute,
    setStatus,
    setSelectedService,
    setScheduleMode,
  } = useCustomerApp();

  const [timing, setTiming] = useState<"now" | "schedule">("now");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const result = validateMovingStep(useCustomerApp.getState());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSelectedService("truck");
    ensureRoute({
      pickup: "Heavy cargo pickup — Windhoek",
      destination: "Drop-off — residential / commercial",
    });
    setScheduleMode(timing === "schedule" ? "later" : "now");
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

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Route details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup location</p>
                <p className="font-semibold">{pickup?.label ?? "Use home map or confirm on review"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <Flag className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Drop-off destination</p>
                <p className="font-semibold">{destination?.label ?? "Use home map or confirm on review"}</p>
              </div>
            </div>
          </div>
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
          <div className="grid grid-cols-3 gap-3">
            {["Main item", "Side view", "Obstacles"].map((label) => (
              <button
                key={label}
                type="button"
                className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground transition hover:bg-secondary/70"
              >
                <Camera className="mb-1 h-5 w-5" />
                <span className="px-1 text-center text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs italic text-muted-foreground">Photos of stairs, doorways, or lift points help the crew prepare.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timing</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTiming("now")}
              className={cn(
                "flex flex-col items-center rounded-xl border-2 p-4 transition active:scale-[0.98]",
                timing === "now" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary/50",
              )}
            >
              <Bolt className="mb-2 h-6 w-6" />
              <span className="font-semibold">Immediate</span>
            </button>
            <button
              type="button"
              onClick={() => setTiming("schedule")}
              className={cn(
                "flex flex-col items-center rounded-xl border-2 p-4 transition active:scale-[0.98]",
                timing === "schedule"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary/50",
              )}
            >
              <CalendarDays className="mb-2 h-6 w-6" />
              <span className="font-semibold">Schedule</span>
              <span className="mt-1 text-xs opacity-90">Pick date on review</span>
            </button>
          </div>
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
