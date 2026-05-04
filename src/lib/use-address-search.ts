import { useEffect, useState } from "react";
import type { LatLng } from "./types";

export interface AddressResult {
  label: string;
  shortLabel: string;
  coord: LatLng;
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: { suburb?: string; city?: string; town?: string; village?: string };
}

/**
 * Free OpenStreetMap Nominatim geocoder.
 * Debounced, biased toward the user's current location.
 * No API key required. Polite usage: ≤1 req/sec, custom UA recommended.
 */
export function useAddressSearch(query: string, near: LatLng | null) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          format: "json",
          addressdetails: "1",
          limit: "6",
        });
        if (near) {
          // 0.5° box around the user (~55km) — soft viewbox bias
          const d = 0.5;
          params.set(
            "viewbox",
            `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`,
          );
          params.set("bounded", "0");
        }
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: ctrl.signal,
            headers: { "Accept-Language": "en" },
          },
        );
        if (!res.ok) throw new Error("geocode failed");
        const data: NominatimItem[] = await res.json();
        const mapped: AddressResult[] = data.map((it) => {
          const a = it.address ?? {};
          const sub = a.suburb ?? a.city ?? a.town ?? a.village ?? "";
          const head = it.name || it.display_name.split(",")[0];
          return {
            label: it.display_name,
            shortLabel: sub ? `${head} · ${sub}` : head,
            coord: { lat: parseFloat(it.lat), lng: parseFloat(it.lon) },
          };
        });
        setResults(mapped);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query, near?.lat, near?.lng]);

  return { results, loading };
}
