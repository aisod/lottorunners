import { MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAddressSearch } from "@/lib/use-address-search";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/lib/types";

type PickResult = { shortLabel: string; coord: LatLng };
type StopField = "pickup" | "destination";

function RouteStopRow({
  field,
  heading,
  value,
  placeholder,
  query,
  isActive,
  isFirst,
  onActivate,
  onQueryChange,
}: {
  field: StopField;
  heading: string;
  value: string;
  placeholder: string;
  query: string;
  isActive: boolean;
  isFirst: boolean;
  onActivate: () => void;
  onQueryChange: (q: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  const displayValue = isActive ? query : value;
  const showPlaceholder = !displayValue && !isActive;

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-xl px-1 py-2.5 text-left transition-colors",
        isActive ? "bg-primary/[0.06] ring-1 ring-primary/20" : "hover:bg-muted/40",
      )}
    >
      <div className="relative flex w-5 shrink-0 flex-col items-center pt-1">
        {isFirst ? (
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full ring-2 ring-background",
              isActive ? "bg-primary" : "bg-primary/80",
            )}
            aria-hidden
          />
        ) : (
          <MapPin
            className={cn("h-[18px] w-[18px]", isActive ? "text-destructive" : "text-destructive/85")}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1 pb-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/90">{heading}</p>
        {isActive ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={placeholder}
            className="mt-0.5 w-full bg-transparent text-[16px] font-medium leading-snug text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            autoComplete="off"
            aria-label={heading}
          />
        ) : (
          <p
            className={cn(
              "mt-0.5 truncate text-[16px] leading-snug",
              showPlaceholder ? "font-normal text-muted-foreground/70" : "font-medium text-foreground",
            )}
          >
            {showPlaceholder ? placeholder : value}
          </p>
        )}
      </div>
      {isActive ? (
        <Search className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      ) : null}
    </button>
  );
}

export function CustomerRouteStopsCard({
  near,
  pickupLabel,
  destinationLabel,
  onPickPickup,
  onPickDestination,
  pickupHeading = "Pick up",
  destinationHeading = "Destination",
  className,
}: {
  near: LatLng | null;
  pickupLabel: string;
  destinationLabel: string;
  onPickPickup: (r: PickResult) => void;
  onPickDestination: (r: PickResult) => void;
  pickupHeading?: string;
  destinationHeading?: string;
  className?: string;
}) {
  const [activeField, setActiveField] = useState<StopField | null>(null);
  const [pickupQuery, setPickupQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeField) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActiveField(null);
        setPickupQuery("");
        setDestinationQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeField]);

  const pickupSearch = useAddressSearch(pickupQuery, near);
  const destinationSearch = useAddressSearch(destinationQuery, near);

  const activeQuery = activeField === "pickup" ? pickupQuery : activeField === "destination" ? destinationQuery : "";
  const { results, loading } =
    activeField === "pickup" ? pickupSearch : activeField === "destination" ? destinationSearch : { results: [], loading: false };

  const showResultsPanel =
    activeField !== null && (results.length > 0 || (activeQuery.length >= 3 && !loading));

  const pickupDisplay = pickupLabel === "Set pickup location" || pickupLabel === "Set pickup" ? "" : pickupLabel;
  const destinationDisplay =
    destinationLabel === "Set destination location" || destinationLabel === "Where to?" ? "" : destinationLabel;

  const handlePick = (r: PickResult) => {
    if (activeField === "pickup") {
      onPickPickup(r);
      setPickupQuery("");
      setActiveField("destination");
    } else if (activeField === "destination") {
      onPickDestination(r);
      setDestinationQuery("");
      setActiveField(null);
    }
  };

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-2xl bg-card shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-border/30">
        <div className="relative px-3 py-2">
          {/* Vertical connector behind rows */}
          <div
            className="pointer-events-none absolute bottom-6 left-[1.375rem] top-8 w-px bg-border/70"
            aria-hidden
          />
          <RouteStopRow
            field="pickup"
            heading={pickupHeading}
            value={pickupDisplay}
            placeholder="Where from?"
            query={pickupQuery}
            isActive={activeField === "pickup"}
            isFirst
            onActivate={() => {
              setActiveField("pickup");
              setPickupQuery(pickupDisplay);
            }}
            onQueryChange={setPickupQuery}
          />
          <RouteStopRow
            field="destination"
            heading={destinationHeading}
            value={destinationDisplay}
            placeholder="Where to?"
            query={destinationQuery}
            isActive={activeField === "destination"}
            isFirst={false}
            onActivate={() => {
              setActiveField("destination");
              setDestinationQuery(destinationDisplay);
            }}
            onQueryChange={setDestinationQuery}
          />
        </div>
      </div>

      {showResultsPanel ? (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(r)}
              className="flex w-full items-center gap-3 border-b border-border/30 px-4 py-3.5 text-left last:border-b-0 active:bg-muted/60 hover:bg-muted/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/80">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">{r.shortLabel}</span>
            </button>
          ))}
          {activeQuery.length >= 3 && !loading && results.length === 0 ? (
            <p className="px-4 py-3.5 text-center text-sm text-muted-foreground">No matches — try the home map pin</p>
          ) : null}
          {loading ? (
            <p className="px-4 py-2 text-center text-xs text-muted-foreground">Searching…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Map-style hero strip used on ride and errand flows. */
export function CustomerRouteStopsHeroSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="-mx-4 overflow-hidden border-y border-border/60 bg-[#e8ecf4] sm:-mx-6">
      <div className="relative h-[15.5rem] w-full sm:h-56">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.93_0.02_250)_0%,oklch(0.88_0.04_230)_100%)]" />
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">{children}</div>
      </div>
    </section>
  );
}
