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
  /** Customer account email (same as auth session email). */
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  /** Assigned runner account email. */
  runnerId?: string;
  runnerEmail?: string;
  runnerName?: string;
  runnerPhone?: string;
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
  runnerRating?: number;
  proofPhotoUrl?: string;
  errandCategory?: ErrandCategoryId;
  /** Who created the job — customer app vs business portal. */
  source?: "customer" | "business";
  businessId?: string;
  businessEmail?: string;
  businessName?: string;
  batchId?: string;
  batchName?: string;
  batchStopIndex?: number;
}

export type BookingValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };
