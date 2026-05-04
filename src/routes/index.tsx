import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LiveMapClient } from "@/components/live-map-client";
import { BottomSheet } from "@/components/bottom-sheet";
import { ServiceSelector } from "@/components/service-selector";
import { ErrandCategoryPicker } from "@/components/errand-category-picker";
import { LocationPicker } from "@/components/location-picker";
import { FareEstimate } from "@/components/fare-estimate";
import { Searching } from "@/components/searching";
import { TripTracking } from "@/components/trip-tracking";
import { AppHeader } from "@/components/app-header";
import { HistorySheet } from "@/components/history-sheet";
import { useGeolocation } from "@/lib/use-geolocation";
import { useSimulatedRunners } from "@/lib/use-simulated-runners";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lotto Runners — Errands, rides & deliveries on demand" },
      {
        name: "description",
        content:
          "Request errand runners, rides, deliveries and trucks in real time across Namibia. Live map, instant matching, in-app payment.",
      },
      { property: "og:title", content: "Lotto Runners — Uber for errands" },
      {
        property: "og:description",
        content: "Live map, four services, real-time tracking. Built for Namibia.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const geo = useGeolocation();
  const {
    userLocation,
    setUserLocation,
    pickup,
    destination,
    setPickup,
    setDestination,
    selectedService,
    status,
    setStatus,
    activeTrip,
  } = useApp();

  const [showHistory, setShowHistory] = useState(false);
  const [pickField, setPickField] = useState<"pickup" | "destination">("pickup");

  useEffect(() => {
    if (geo.location && !userLocation) {
      setUserLocation(geo.location);
    }
  }, [geo.location, userLocation, setUserLocation]);

  const runners = useSimulatedRunners(userLocation);

  // Track which field is being set when in selecting status
  useEffect(() => {
    if (status === "selecting") {
      setPickField(pickup ? "destination" : "pickup");
    }
  }, [status, pickup]);

  const handleMapClick = (l: { lat: number; lng: number }) => {
    if (status !== "selecting") return;
    const label = `Pin (${l.lat.toFixed(3)}, ${l.lng.toFixed(3)})`;
    if (!pickup || pickField === "pickup") {
      setPickup({ coord: l, label });
      setPickField("destination");
    } else {
      setDestination({ coord: l, label });
    }
  };

  const sheet = (() => {
    if (activeTrip || ["searching", "matched", "en_route", "arrived", "on_trip", "completed"].includes(status)) {
      if (status === "searching") return <Searching runners={runners} />;
      return <TripTracking />;
    }
    if (status === "estimating") return <FareEstimate />;
    if (status === "selecting") return <LocationPicker />;
    return <ServiceSelector />;
  })();

  const followLocation =
    activeTrip?.runner?.position ??
    (status === "selecting" ? destination?.coord ?? pickup?.coord ?? null : null);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <AppHeader onHistory={() => setShowHistory(true)} />

      <div className="absolute inset-0">
        <LiveMapClient
          userLocation={userLocation}
          runners={runners}
          pickup={pickup?.coord ?? null}
          destination={destination?.coord ?? null}
          activeRunner={activeTrip?.runner ?? null}
          onMapClick={handleMapClick}
          followLocation={followLocation}
        />
      </div>

      {!userLocation && (
        <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent" />
            <p className="text-sm font-medium">Finding you on the map…</p>
            {geo.error && <p className="mt-1 text-xs text-muted-foreground">{geo.error}</p>}
          </div>
        </div>
      )}

      {selectedService && status === "idle" && (
        // service was just deselected? no-op, but keep status logic clean
        <></>
      )}

      <BottomSheet>{sheet}</BottomSheet>

      {showHistory && <HistorySheet onClose={() => setShowHistory(false)} />}
    </div>
  );
}
