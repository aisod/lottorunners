import type { ServiceConfig, ServiceType, TruckSizeId } from "./types";

/** Base dispatch fees by truck class (NAD). Per-km still uses `SERVICES.truck.perKm`. */
export const TRUCK_SIZE_BASE_NAD: Record<TruckSizeId, number> = {
  small: 250,
  medium: 850,
  large: 1950,
};

export const TRUCK_LABOUR_FEE_NAD = 150;
export const TRUCK_EXTRA_HELPER_FEE_NAD = 80;

export const SERVICES: Record<ServiceType, ServiceConfig> = {
  errand: {
    id: "errand",
    label: "Errand Runner",
    tagline: "A runner on foot or bike does it for you",
    icon: "🏃",
    baseFare: 25,
    perKm: 8,
    etaMin: 4,
    color: "accent",
  },
  ride: {
    id: "ride",
    label: "Ride",
    tagline: "Get picked up by a driver",
    icon: "🚗",
    baseFare: 30,
    perKm: 12,
    etaMin: 5,
    color: "primary",
  },
  delivery: {
    id: "delivery",
    label: "Delivery",
    tagline: "Send a package, fast",
    icon: "🛵",
    baseFare: 20,
    perKm: 10,
    etaMin: 3,
    color: "chart-2",
  },
  truck: {
    id: "truck",
    label: "Truck",
    tagline: "Furniture, bulk goods, moving",
    icon: "🚛",
    baseFare: 120,
    perKm: 22,
    etaMin: 12,
    color: "chart-3",
  },
};

export const SERVICE_ORDER: ServiceType[] = ["errand", "ride", "delivery", "truck"];

export function estimateFare(service: ServiceType, distanceKm: number) {
  const cfg = SERVICES[service];
  return Math.round(cfg.baseFare + cfg.perKm * Math.max(distanceKm, 0.5));
}

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
