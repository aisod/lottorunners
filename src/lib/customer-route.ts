import { WINDHOEK } from "./geo-defaults";
import type { LatLng } from "./types";

export function windhoekCoord(): LatLng {
  return { lat: WINDHOEK[0], lng: WINDHOEK[1] };
}

export type RouteStop = { coord: LatLng; label: string };

export function defaultPickupLabel(): string {
  return "Pickup — Windhoek CBD";
}

export function defaultDestinationLabel(): string {
  return "Drop-off — destination";
}

/** Ensures pickup and destination exist for fare estimates and tracking. */
export function ensureCustomerRoute(
  pickup: RouteStop | null,
  destination: RouteStop | null,
  setPickup: (p: RouteStop) => void,
  setDestination: (d: RouteStop) => void,
  labels?: { pickup?: string; destination?: string },
): void {
  const base = windhoekCoord();
  if (!pickup) {
    setPickup({
      coord: base,
      label: labels?.pickup ?? defaultPickupLabel(),
    });
  }
  if (!destination) {
    setDestination({
      coord: { lat: base.lat + 0.018, lng: base.lng + 0.022 },
      label: labels?.destination ?? defaultDestinationLabel(),
    });
  }
}

/** Map free-text addresses to prototype coords (Windhoek area). */
export function routeFromAddresses(pickupAddress: string, destinationAddress: string): {
  pickup: RouteStop;
  destination: RouteStop;
} {
  const base = windhoekCoord();
  const pickupText = pickupAddress.trim() || defaultPickupLabel();
  const destText = destinationAddress.trim() || defaultDestinationLabel();
  return {
    pickup: { coord: base, label: pickupText },
    destination: {
      coord: { lat: base.lat + 0.018, lng: base.lng + 0.022 },
      label: destText,
    },
  };
}
