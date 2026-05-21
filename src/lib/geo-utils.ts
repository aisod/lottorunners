import type { LatLng } from "./types";
import { WINDHOEK } from "./geo-defaults";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres between two WGS84 points. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinRadiusKm(center: LatLng, point: LatLng, radiusKm: number): boolean {
  return distanceKm(center, point) <= radiusKm;
}

const WINDHOEK_CENTER: LatLng = { lat: WINDHOEK[0], lng: WINDHOEK[1] };

/** Rough label for dashboard map chrome (no reverse geocoding). */
export function formatMapZoneLabel(center: LatLng | null): string {
  if (!center) return "Locating…";
  if (distanceKm(center, WINDHOEK_CENTER) <= 35) return "Windhoek area";
  return "Your zone";
}
