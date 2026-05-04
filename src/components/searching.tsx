import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { SERVICES } from "@/lib/services";
import { haversine } from "@/lib/services";
import type { Runner, TripRequest } from "@/lib/types";

interface SearchingProps {
  runners: Runner[];
}

export function Searching({ runners }: SearchingProps) {
  const {
    selectedService,
    pickup,
    destination,
    paymentMethod,
    errandDescription,
    errandCategory,
    basketValue,
    durationMin,
    buildEstimate,
    setStatus,
    setActiveTrip,
    reset,
  } = useApp();

  useEffect(() => {
    if (!pickup || !destination || !selectedService) return;

    const candidates = runners.filter((r) => {
      if (selectedService === "errand") return true; // any vehicle/foot can do an errand
      return r.vehicle === selectedService;
    });
    const sorted = [...candidates].sort(
      (a, b) => haversine(a.position, pickup.coord) - haversine(b.position, pickup.coord),
    );
    const matched = sorted[0] ?? runners[0];
    if (!matched) return;

    const t = setTimeout(() => {
      const est = buildEstimate();
      if (!est) return;
      const trip: TripRequest = {
        id: `trip-${Date.now()}`,
        service: selectedService,
        pickup: pickup.coord,
        pickupLabel: pickup.label,
        destination: destination.coord,
        destinationLabel: destination.label,
        errandDescription: errandDescription || undefined,
        errandCategory: errandCategory ?? undefined,
        basketValue: basketValue || undefined,
        durationMin: errandCategory ? durationMin : undefined,
        fare: est.fare,
        fareLow: undefined,
        fareHigh: undefined,
        distanceKm: est.distanceKm,
        etaMin: est.etaMin,
        payment: paymentMethod,
        runner: { ...matched, vehicle: selectedService === "errand" ? "errand" : matched.vehicle },
        status: "matched",
        createdAt: Date.now(),
      };
      setActiveTrip(trip);
      setStatus("matched");
    }, 2400);

    return () => clearTimeout(t);
  }, [
    runners,
    pickup,
    destination,
    selectedService,
    paymentMethod,
    errandDescription,
    errandCategory,
    basketValue,
    durationMin,
    buildEstimate,
    setActiveTrip,
    setStatus,
  ]);

  const svc = selectedService ? SERVICES[selectedService] : null;

  return (
    <div className="py-2 text-center">
      <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
        <div className="absolute inset-2 animate-ping rounded-full bg-accent/30 [animation-delay:200ms]" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl shadow-[var(--shadow-glow)]">
          {svc?.icon}
        </div>
      </div>
      <h2 className="text-xl font-bold">Finding the closest runner…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Matching you with a verified {svc?.label.toLowerCase()} nearby
      </p>
      <button
        onClick={reset}
        className="mt-5 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold hover:bg-secondary"
      >
        Cancel request
      </button>
    </div>
  );
}
