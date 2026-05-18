import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { LiveMapClient } from "@/components/live-map-client";
import { ServiceSelector } from "@/components/service-selector";
import { useGeolocation } from "@/lib/use-geolocation";
import { useSimulatedRunners } from "@/lib/use-simulated-runners";
import { isCustomerOnboarded } from "@/lib/store";
import { useCustomerApp } from "@/lib/customer-store";

export function CustomerHomePage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const {
    userLocation,
    setUserLocation,
    pickup,
    destination,
    setPickup,
    setDestination,
    status,
    restoreHomeUi,
  } = useCustomerApp();

  const [pickField, setPickField] = useState<"pickup" | "destination">("pickup");

  useEffect(() => {
    if (!isCustomerOnboarded()) {
      navigate({ to: "/customer/profile-setup", replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    restoreHomeUi();
  }, [restoreHomeUi]);

  useEffect(() => {
    if (geo.location && !userLocation) {
      setUserLocation(geo.location);
    }
  }, [geo.location, userLocation, setUserLocation]);

  useEffect(() => {
    if (!pickup && userLocation) {
      setPickup({
        coord: userLocation,
        label: "Home — 123 Independence Ave, Windhoek",
      });
    }
  }, [pickup, userLocation, setPickup]);

  const runners = useSimulatedRunners(userLocation);

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

  const followLocation = status === "selecting" ? destination?.coord ?? pickup?.coord ?? null : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <AppHeader />

      <div className="absolute inset-0">
        <LiveMapClient
          userLocation={userLocation}
          runners={runners}
          pickup={pickup?.coord ?? null}
          destination={destination?.coord ?? null}
          activeRunner={null}
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

      <BottomSheet>
        <ServiceSelector />
      </BottomSheet>

      <BottomTabBar />
    </div>
  );
}
