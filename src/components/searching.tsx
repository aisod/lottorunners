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
  const nearby = runners.slice(0, 6);

  return (
    <div className="py-2">
      <div className="relative mx-auto mb-6 flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary/20" />
        <div className="absolute inset-4 animate-ping rounded-full border-2 border-primary/30 [animation-delay:200ms]" />
        <div className="absolute inset-10 animate-ping rounded-full border-2 border-primary/40 [animation-delay:400ms]" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-4px_oklch(0.48_0.14_248/0.5)] ring-4 ring-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </div>
      </div>

      <div className="mx-auto mb-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-card px-4 py-3 text-center shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-base font-bold">Finding your Runner…</span>
      </div>

      <div>
        <h3 className="text-lg font-bold">Nearby Runners</h3>
        <p className="text-xs text-muted-foreground">Connecting you with the closest available.</p>
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {nearby.map((r) => (
            <div key={r.id} className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-bold text-primary">
                {r.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">{r.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>
                  {r.rating.toFixed(1)} · {Math.max(1, Math.round(haversine(r.position, pickup?.coord ?? r.position) * 2))} min
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={reset}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold hover:bg-secondary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        Cancel Request
      </button>
      {svc ? null : null}
    </div>
  );
}
