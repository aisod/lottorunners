import type { ErrandCategoryId } from "./errand-categories";

export type ServiceType = "errand" | "ride" | "delivery" | "truck";

export interface ServiceConfig {
  id: ServiceType;
  label: string;
  tagline: string;
  icon: string; // emoji for now; swap for branded SVGs later
  baseFare: number; // NAD
  perKm: number;
  etaMin: number;
  color: string; // semantic token suffix
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Runner {
  id: string;
  name: string;
  vehicle: ServiceType;
  rating: number;
  plate: string;
  position: LatLng;
  heading: number;
}

export type RequestStatus =
  | "idle"
  | "errand_category"
  | "selecting"
  | "estimating"
  | "searching"
  | "matched"
  | "en_route"
  | "arrived"
  | "on_trip"
  | "completed"
  | "rated";

export type PaymentMethod = "momo" | "card" | "cash";

export interface TripRequest {
  id: string;
  service: ServiceType;
  pickup: LatLng;
  pickupLabel: string;
  destination: LatLng;
  destinationLabel: string;
  errandDescription?: string;
  errandCategory?: ErrandCategoryId;
  basketValue?: number;
  durationMin?: number;
  fareLow?: number;
  fareHigh?: number;
  fare: number;
  distanceKm: number;
  etaMin: number;
  payment: PaymentMethod;
  runner?: Runner;
  status: RequestStatus;
  rating?: number;
  createdAt: number;
}
