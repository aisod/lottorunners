import type { ErrandCategoryId } from "./errand-categories";
import type { PaymentMethod, ScheduleMode, ServiceType, TruckSizeId } from "./types";

const DRAFT_KEY = "lr-customer-booking-draft-v1";

export type CustomerBookingDraft = {
  selectedService: ServiceType | null;
  pickup: { coord: { lat: number; lng: number }; label: string } | null;
  destination: { coord: { lat: number; lng: number }; label: string } | null;
  errandDescription: string;
  errandCategory: ErrandCategoryId | null;
  storePreference: string;
  basketValue: number;
  durationMin: number;
  truckSizeId: TruckSizeId | null;
  truckLabour: boolean;
  truckExtraHelpers: number;
  movingNotes: string;
  paymentMethod: PaymentMethod;
  rideSubType: string | null;
  scheduleMode: ScheduleMode;
  scheduledAt: number | null;
};

export function loadCustomerBookingDraft(): CustomerBookingDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CustomerBookingDraft;
  } catch {
    return null;
  }
}

export function saveCustomerBookingDraft(draft: CustomerBookingDraft): void {
  if (typeof window === "undefined") return;
  if (!draft.selectedService && !draft.pickup) return;
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearCustomerBookingDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DRAFT_KEY);
}
