import type { ErrandCategoryId } from "./errand-categories";
import type { LatLng, PaymentMethod, ScheduleMode, ServiceType } from "./types";

/** Shared marketplace job lifecycle (customer ↔ runner). */
export type MarketplaceJobStatus =
  | "pending"
  | "declined"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface MarketplaceJob {
  id: string;
  customerId: string;
  customerName: string;
  runnerId?: string;
  runnerName?: string;
  serviceType: ServiceType;
  subType?: string;
  pickupAddress: string;
  pickup: LatLng;
  dropoffAddress: string;
  dropoff: LatLng;
  description?: string;
  estimatedFare: number;
  distanceKm: number;
  etaMin: number;
  paymentMethod: PaymentMethod;
  status: MarketplaceJobStatus;
  scheduleMode: ScheduleMode;
  scheduledAt?: number;
  basketValue?: number;
  durationMin?: number;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  rating?: number;
  errandCategory?: ErrandCategoryId;
}

export type BookingValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };
