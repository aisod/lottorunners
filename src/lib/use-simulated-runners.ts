import { useEffect, useState } from "react";
import { shouldUseSimulatedRunners } from "@/lib/runner-location-service";
import type { Runner, ServiceType, LatLng } from "@/lib/types";

const VEHICLE_POOL: ServiceType[] = ["errand", "ride", "ride", "delivery", "delivery", "truck"];
const NAMES = ["Tangeni", "Selma", "Petrus", "Naomi", "Kavaa", "Erastus", "Hilma", "Shilongo"];

function randomOffset(center: LatLng, radiusKm = 1.2): LatLng {
  const r = (radiusKm / 111) * Math.sqrt(Math.random());
  const t = Math.random() * 2 * Math.PI;
  return {
    lat: center.lat + r * Math.cos(t),
    lng: center.lng + r * Math.sin(t) / Math.cos((center.lat * Math.PI) / 180),
  };
}

export function useSimulatedRunners(center: LatLng | null, count = 8): Runner[] {
  const [runners, setRunners] = useState<Runner[]>([]);
  const demoMode = shouldUseSimulatedRunners();

  useEffect(() => {
    if (!demoMode || !center) {
      setRunners([]);
      return;
    }
    const initial: Runner[] = Array.from({ length: count }).map((_, i) => ({
      id: `sim-${i}`,
      name: NAMES[i % NAMES.length],
      vehicle: VEHICLE_POOL[i % VEHICLE_POOL.length],
      rating: 4.5 + Math.random() * 0.5,
      plate: `N ${1000 + Math.floor(Math.random() * 8999)} W`,
      position: randomOffset(center),
      heading: Math.random() * 360,
    }));
    setRunners(initial);
  }, [center?.lat, center?.lng, count, demoMode]);

  useEffect(() => {
    if (!demoMode || !center || runners.length === 0) return;
    const id = setInterval(() => {
      setRunners((rs) =>
        rs.map((r) => {
          // gentle drift
          const stepKm = 0.04;
          const t = (r.heading * Math.PI) / 180;
          const next = {
            lat: r.position.lat + (stepKm / 111) * Math.cos(t),
            lng:
              r.position.lng +
              (stepKm / 111) * Math.sin(t) / Math.cos((r.position.lat * Math.PI) / 180),
          };
          // occasional turn
          const heading =
            Math.random() < 0.15 ? (r.heading + (Math.random() - 0.5) * 90 + 360) % 360 : r.heading;
          // keep them roughly nearby
          const dx = next.lng - center.lng;
          const dy = next.lat - center.lat;
          if (dx * dx + dy * dy > 0.0006) {
            return { ...r, heading: (r.heading + 180) % 360 };
          }
          return { ...r, position: next, heading };
        }),
      );
    }, 2000);
    return () => clearInterval(id);
  }, [center?.lat, center?.lng, runners.length, demoMode]);

  return demoMode ? runners : [];
}
