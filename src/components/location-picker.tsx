import { useEffect, useState } from "react";
import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES } from "@/lib/services";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { AddressSearchInput } from "@/components/address-search-input";
import { isValidRouteStop } from "@/lib/geocode-address";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/lib/types";

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
    errandCategory,
    basketValue,
    setBasketValue,
    durationMin,
    setDurationMin,
    setStatus,
    reset,
  } = useCustomerApp();

  const [field, setField] = useState<"pickup" | "destination">(pickup ? "destination" : "pickup");

  useEffect(() => {
    if (!pickup && userLocation) {
      setPickup({ coord: userLocation, label: "Current location" });
    }
  }, [pickup, userLocation, setPickup]);

  const svc = selectedService ? SERVICES[selectedService] : null;
  const cat = selectedService === "errand" && errandCategory ? ERRAND_CATEGORIES[errandCategory] : null;
  const normalizedErrandDescription = (errandDescription ?? "").trim();

  const detailsValid =
    selectedService !== "errand" ||
    (normalizedErrandDescription.length > 3 &&
      (!cat?.needsBasketValue || basketValue > 0) &&
      (!cat?.needsDuration || durationMin > 0));

  const canContinue =
    isValidRouteStop(pickup) && isValidRouteStop(destination) && detailsValid;

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
          onClick={() => {
            // For errand flow, go back to category sub-picker; otherwise reset.
            if (selectedService === "errand") {
              setStatus("errand_category");
            } else {
              reset();
            }
          }}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cat?.icon ?? svc?.icon}</span>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">{cat?.label ?? svc?.label}</h2>
            {cat && <p className="text-[11px] text-muted-foreground">{cat.tagline}</p>}
          </div>
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
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {cat?.id === "queue_sitting" ? "You / where to meet" : "Pickup"}
            </div>
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
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {cat?.id === "queue_sitting"
                ? "Office / venue to wait at"
                : cat?.id === "personal_shopper"
                ? "Shop to buy from"
                : "Destination"}
            </div>
            <div className="truncate text-sm font-medium">{destination?.label ?? "Where to?"}</div>
          </div>
        </button>
      </div>

      <AddressSearchInput
        near={userLocation}
        field={field}
        className="mt-3"
        onPick={(r) => pick(r.shortLabel, r.coord)}
      />

      {selectedService === "errand" && cat && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {cat.id === "personal_shopper"
                ? "Your shopping list"
                : cat.id === "documents"
                ? "What needs to be done"
                : "Details for the runner"}
            </label>
            <textarea
              value={errandDescription}
              onChange={(e) => setErrandDescription(e.target.value.slice(0, 400))}
              placeholder={cat.detailsPlaceholder}
              className="mt-1 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-accent focus:outline-none"
              rows={3}
            />
            <div className="mt-1 text-right text-[11px] text-muted-foreground">
              {errandDescription.length}/400
            </div>
          </div>

          {cat.needsBasketValue && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Estimated basket value (NAD)
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <span className="text-sm font-semibold text-muted-foreground">N$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={basketValue || ""}
                  onChange={(e) => setBasketValue(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="e.g. 350"
                  className="w-full bg-transparent py-3 text-sm focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                We charge a 10% service fee of the basket (capped). Pay the actual receipt to the runner.
              </p>
            </div>
          )}

          {cat.needsDuration && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Estimated wait time
              </label>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {[30, 60, 90, 120].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDurationMin(m)}
                    className={cn(
                      "rounded-lg border-2 py-2 text-xs font-semibold transition-all",
                      durationMin === m
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`}
                  </button>
                ))}
              </div>
            </div>
          )}
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
