import type { TripRequest } from "./types";

const HISTORY_KEY = "lr-customer-trip-history-v1";

function isTripRequest(value: unknown): value is TripRequest {
  if (!value || typeof value !== "object") return false;
  const trip = value as TripRequest;
  return (
    typeof trip.id === "string" &&
    typeof trip.service === "string" &&
    typeof trip.fare === "number" &&
    typeof trip.createdAt === "number"
  );
}

export function loadCustomerTripHistory(): TripRequest[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTripRequest);
  } catch {
    return [];
  }
}

export function saveCustomerTripHistory(history: TripRequest[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
