import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/lib/types";

const SUGGESTIONS: { label: string; offset: [number, number] }[] = [
  { label: "Maerua Mall", offset: [0.005, 0.008] },
  { label: "Wernhil Park", offset: [-0.004, -0.006] },
  { label: "Eros Airport", offset: [-0.012, 0.014] },
  { label: "Independence Ave", offset: [0.002, -0.004] },
  { label: "Klein Windhoek", offset: [0.01, 0.012] },
  { label: "Katutura Hospital", offset: [0.018, -0.018] },
  { label: "UNAM Main Campus", offset: [0.022, 0.006] },
  { label: "The Grove Mall", offset: [-0.018, 0.022] },
];

function offsetCoord(base: LatLng, offset: [number, number]): LatLng {
  return { lat: base.lat + offset[0], lng: base.lng + offset[1] };
}

export function LocationPicker() {
  const {
    selectedService,
    pickup,
    destination,
    setPickup,
    setDestination,
    userLocation,
    errandDescription,
    setErrandDescription,
    setStatus,
    reset,
  } = useApp();

  const [field, setField] = useState<"pickup" | "destination">(pickup ? "destination" : "pickup");

  useEffect(() => {
    if (!pickup && userLocation) {
      setPickup({ coord: userLocation, label: "Current location" });
    }
  }, [pickup, userLocation, setPickup]);

  const svc = selectedService ? SERVICES[selectedService] : null;
  const canContinue = pickup && destination && (selectedService !== "errand" || errandDescription.trim().length > 3);

  const pick = (label: string, coord: LatLng) => {
    if (field === "pickup") {
      setPickup({ coord, label });
      setField("destination");
    } else {
      setDestination({ coord, label });
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={reset}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{svc?.icon}</span>
          <h2 className="text-lg font-bold">{svc?.label}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/40 p-3">
        <button
          onClick={() => setField("pickup")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
            field === "pickup" && "bg-card shadow-sm",
          )}
        >
          <div className="h-3 w-3 rounded-full bg-[oklch(0.55_0.2_250)]" />
          <div className="flex-1 truncate">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pickup</div>
            <div className="truncate text-sm font-medium">{pickup?.label ?? "Set pickup"}</div>
          </div>
        </button>
        <div className="ml-[7px] my-1 h-3 w-px bg-border" />
        <button
          onClick={() => setField("destination")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
            field === "destination" && "bg-card shadow-sm",
          )}
        >
          <div className="h-3 w-3 rotate-45 bg-accent" />
          <div className="flex-1 truncate">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Destination</div>
            <div className="truncate text-sm font-medium">{destination?.label ?? "Where to?"}</div>
          </div>
        </button>
      </div>

      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
        {userLocation &&
          SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => pick(s.label, offsetCoord(userLocation, s.offset))}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-secondary"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">📍</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">Windhoek</div>
              </div>
            </button>
          ))}
        <p className="px-2 pt-1 text-[11px] text-muted-foreground">
          Tip: tap anywhere on the map to drop a {field === "pickup" ? "pickup" : "destination"} pin.
        </p>
      </div>

      {selectedService === "errand" && (
        <div className="mt-3">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Describe your errand
          </label>
          <textarea
            value={errandDescription}
            onChange={(e) => setErrandDescription(e.target.value.slice(0, 280))}
            placeholder="e.g. Pick up groceries from Checkers Maerua. I'll send N$ 200 cash."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-accent focus:outline-none"
            rows={3}
          />
          <div className="mt-1 text-right text-[11px] text-muted-foreground">
            {errandDescription.length}/280
          </div>
        </div>
      )}

      <button
        disabled={!canContinue}
        onClick={() => setStatus("estimating")}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 text-base font-semibold transition-all",
          canContinue
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground",
        )}
      >
        See price
      </button>
    </div>
  );
}
