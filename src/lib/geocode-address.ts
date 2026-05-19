import type { AddressResult } from "./use-address-search";
import type { LatLng } from "./types";

export type RouteStop = { coord: LatLng; label: string };

export function isValidLatLng(coord: LatLng | null | undefined): boolean {
  if (!coord) return false;
  const { lat, lng } = coord;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return true;
}

export function isValidRouteStop(stop: RouteStop | null | undefined): boolean {
  if (!stop?.label?.trim()) return false;
  return isValidLatLng(stop.coord);
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: { suburb?: string; city?: string; town?: string; village?: string };
}

function mapNominatimItem(it: NominatimItem): AddressResult {
  const a = it.address ?? {};
  const sub = a.suburb ?? a.city ?? a.town ?? a.village ?? "";
  const head = it.name || it.display_name.split(",")[0];
  return {
    label: it.display_name,
    shortLabel: sub ? `${head} · ${sub}` : head,
    coord: { lat: parseFloat(it.lat), lng: parseFloat(it.lon) },
  };
}

/** Geocode a free-text address via Nominatim (returns first match). */
export async function geocodeAddress(query: string, near?: LatLng | null): Promise<AddressResult | null> {
  const q = query.trim();
  if (q.length < 3) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: "1",
  });
  if (near) {
    const d = 0.5;
    params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
    params.set("bounded", "0");
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return null;

  const data: NominatimItem[] = await res.json();
  const first = data[0];
  if (!first) return null;

  const mapped = mapNominatimItem(first);
  return isValidLatLng(mapped.coord) ? mapped : null;
}

export async function geocodeRouteStop(query: string, near?: LatLng | null): Promise<RouteStop | null> {
  const result = await geocodeAddress(query, near);
  if (!result) return null;
  return { label: result.shortLabel, coord: result.coord };
}

/** Prefer an existing stop; otherwise geocode the address text. */
export async function resolveRouteStop(
  existing: RouteStop | null,
  addressText: string,
  near?: LatLng | null,
): Promise<RouteStop | null> {
  if (isValidRouteStop(existing)) return existing;
  return geocodeRouteStop(addressText, near);
}
