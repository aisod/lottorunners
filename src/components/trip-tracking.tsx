import { useEffect, useRef } from "react";
import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES, haversine } from "@/lib/services";
import type { LatLng } from "@/lib/types";

function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

export function TripTracking() {
  const { activeTrip, status, setStatus, updateRunnerPosition, pushHistory, setActiveTrip } =
    useCustomerApp();
  const tickRef = useRef(0);

  // Animate runner: matched -> en_route -> arrived -> on_trip -> completed
  useEffect(() => {
    if (!activeTrip || !activeTrip.runner) return;
    if (status === "rated" || status === "completed") return;

    tickRef.current = 0;
    const total = 60; // ticks
    const startPos = activeTrip.runner.position;
    const id = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      if (status === "matched" || status === "en_route") {
        const t = Math.min(1, tick / 30);
        updateRunnerPosition(lerp(startPos, activeTrip.pickup, t));
        if (status === "matched" && tick > 1) setStatus("en_route");
        if (t >= 1) {
          setStatus("arrived");
          tickRef.current = 0;
        }
      } else if (status === "arrived") {
        if (tick > 4) {
          setStatus("on_trip");
          tickRef.current = 0;
        }
      } else if (status === "on_trip") {
        const t = Math.min(1, tick / 30);
        updateRunnerPosition(lerp(activeTrip.pickup, activeTrip.destination, t));
        if (t >= 1) {
          setStatus("completed");
        }
      }

      if (tick > total + 10) clearInterval(id);
    }, 350);

    return () => clearInterval(id);
  }, [activeTrip?.id, status, setStatus, updateRunnerPosition]);

  if (!activeTrip || !activeTrip.runner) return null;
  const svc = SERVICES[activeTrip.service];

  const statusInfo = (() => {
    switch (status) {
      case "matched":
        return { label: "Runner accepted", sub: "Heading to your pickup" };
      case "en_route":
        return { label: "On the way", sub: "Arriving in a few minutes" };
      case "arrived":
        return { label: "Arrived at pickup", sub: "Meet your runner outside" };
      case "on_trip":
        return { label: "On trip", sub: "Heading to destination" };
      case "completed":
        return { label: "Completed", sub: "Hope it went well!" };
      default:
        return { label: "Connecting…", sub: "" };
    }
  })();

  const distanceLeft =
    status === "on_trip"
      ? haversine(activeTrip.runner.position, activeTrip.destination)
      : haversine(activeTrip.runner.position, activeTrip.pickup);

  if (status === "completed") {
    return (
      <RatePay
        onDone={() => {
          pushHistory({ ...activeTrip, status: "rated" });
          setActiveTrip(null);
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          {statusInfo.label}
        </div>
        <div className="text-xs text-muted-foreground">{svc.label}</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xl text-primary-foreground">
            {activeTrip.runner.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{activeTrip.runner.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>⭐ {activeTrip.runner.rating.toFixed(2)}</span>
              <span>·</span>
              <span>{activeTrip.runner.plate}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl">{svc.icon}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-secondary p-2.5">
            <div className="text-muted-foreground">Distance</div>
            <div className="font-semibold">{distanceLeft.toFixed(2)} km</div>
          </div>
          <div className="rounded-lg bg-secondary p-2.5">
            <div className="text-muted-foreground">Status</div>
            <div className="font-semibold">{statusInfo.sub || "—"}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-secondary">
            💬 Message
          </button>
          <button className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-secondary">
            📞 Call
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[oklch(0.55_0.2_250)]" />
          <span className="font-medium">{activeTrip.pickupLabel}</span>
        </div>
        <div className="my-1 ml-[3px] h-3 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rotate-45 bg-accent" />
          <span className="font-medium">{activeTrip.destinationLabel}</span>
        </div>
        {activeTrip.errandDescription && (
          <div className="mt-2 rounded-lg bg-secondary/60 p-2 text-muted-foreground">
            “{activeTrip.errandDescription}”
          </div>
        )}
      </div>
    </div>
  );
}

function RatePay({ onDone }: { onDone: () => void }) {
  const { activeTrip } = useCustomerApp();
  if (!activeTrip || !activeTrip.runner) return null;
  const svc = SERVICES[activeTrip.service];

  return (
    <div>
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Trip complete</h2>
        <p className="text-sm text-muted-foreground">
          {svc.label} with {activeTrip.runner.name}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Distance</span>
          <span className="font-semibold">{activeTrip.distanceKm.toFixed(2)} km</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Payment</span>
          <span className="font-semibold uppercase">{activeTrip.payment}</span>
        </div>
        <div className="my-3 h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Total</span>
          <span className="text-2xl font-bold">N$ {activeTrip.fare}</span>
        </div>
      </div>

      <RatingStars />

      <button
        onClick={onDone}
        className="mt-4 w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground hover:bg-primary/90"
      >
        Submit rating
      </button>
    </div>
  );
}

function RatingStars() {
  const { activeTrip, setActiveTrip } = useCustomerApp();
  const value = activeTrip?.rating ?? 0;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center">
      <div className="text-sm font-medium text-muted-foreground">How was it?</div>
      <div className="mt-2 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => activeTrip && setActiveTrip({ ...activeTrip, rating: n })}
            className="text-3xl transition-transform hover:scale-110"
            aria-label={`Rate ${n} stars`}
          >
            <span className={n <= value ? "" : "opacity-30 grayscale"}>⭐</span>
          </button>
        ))}
      </div>
    </div>
  );
}
