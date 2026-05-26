import type { ServiceConfig, ServiceType, TruckSizeId } from "./types";
import {
  getPlatformPricing,
  getServices,
  getTruckExtraHelperFeeNad,
  getTruckLabourFeeNad,
  getTruckSizeBaseNad,
  hydratePlatformPricing,
  subscribePlatformPricing,
} from "./platform-pricing";

/** @deprecated Use getServices() for live fares; kept for gradual migration. */
export const SERVICES: Record<ServiceType, ServiceConfig> = new Proxy(
  {} as Record<ServiceType, ServiceConfig>,
  {
    get(_target, prop: string) {
      return getServices()[prop as ServiceType];
    },
    ownKeys() {
      return ["errand", "ride", "delivery", "truck"];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const svc = getServices()[prop as ServiceType];
      if (!svc) return undefined;
      return { enumerable: true, configurable: true, value: svc };
    },
  },
);

/** Base dispatch fees by truck class (NAD). */
export const TRUCK_SIZE_BASE_NAD: Record<TruckSizeId, number> = new Proxy(
  {} as Record<TruckSizeId, number>,
  {
    get(_target, prop: string) {
      return getTruckSizeBaseNad()[prop as TruckSizeId];
    },
  },
);

export const SERVICE_ORDER: ServiceType[] = ["errand", "ride", "delivery", "truck"];

export function estimateFare(service: ServiceType, distanceKm: number) {
  const cfg = getServices()[service];
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

export {
  getServices,
  getPlatformPricing,
  hydratePlatformPricing,
  subscribePlatformPricing,
  getTruckSizeBaseNad,
  getTruckLabourFeeNad,
  getTruckExtraHelperFeeNad,
};
