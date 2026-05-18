import L from "leaflet";
import type { ServiceType } from "./types";

// Fix Leaflet's default icon URL issue in bundlers (we don't use defaults, but this prevents warnings)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

const VEHICLE_EMOJI: Record<ServiceType, string> = {
  errand: "🏃",
  ride: "🚗",
  delivery: "🛵",
  truck: "🚛",
};

export function userMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="user-pulse"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function runnerMarkerIcon(vehicle: ServiceType, active = false) {
  return L.divIcon({
    className: "",
    html: `<div class="runner-marker ${active ? "active" : ""}"><span style="font-size:18px;line-height:1">${VEHICLE_EMOJI[vehicle]}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export function pinIcon(kind: "pickup" | "destination") {
  const color = kind === "pickup" ? "oklch(0.546 0.215 258)" : "oklch(0.78 0.17 75)";
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 4px 10px oklch(0.18 0.04 260 / 0.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}
