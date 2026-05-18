import type { ErrandCategoryId } from "./errand-categories";
import type { BookingValidationResult } from "./jobs-types";
import type { LatLng, PaymentMethod, ScheduleMode, ServiceType, TruckSizeId } from "./types";

export type BookingSnapshot = {
  selectedService: ServiceType | null;
  pickup: { coord: LatLng; label: string } | null;
  destination: { coord: LatLng; label: string } | null;
  errandDescription: string;
  errandCategory: ErrandCategoryId | null;
  storePreference: string;
  basketValue: number;
  durationMin: number;
  truckSizeId: TruckSizeId | null;
  movingNotes: string;
  paymentMethod: PaymentMethod;
  scheduleMode: ScheduleMode;
  scheduledAt: number | null;
  rideSubType: string | null;
};

export function validateBooking(snapshot: BookingSnapshot): BookingValidationResult {
  const errors: Record<string, string> = {};

  if (!snapshot.selectedService) {
    errors.service = "Select a service to continue.";
  }

  if (!snapshot.pickup?.label?.trim()) {
    errors.pickup = "Pickup address is required.";
  }

  const needsDropoff =
    snapshot.selectedService === "ride" ||
    snapshot.selectedService === "delivery" ||
    snapshot.selectedService === "truck";

  if (needsDropoff && !snapshot.destination?.label?.trim()) {
    errors.dropoff = "Drop-off address is required.";
  }

  if (!snapshot.paymentMethod) {
    errors.payment = "Select a payment method.";
  }

  switch (snapshot.selectedService) {
    case "errand": {
      if (!snapshot.errandCategory) {
        errors.errandType = "Select an errand type.";
      }
      const desc = snapshot.errandDescription?.trim() ?? "";
      const store = snapshot.storePreference?.trim() ?? "";
      if (!desc && !store) {
        errors.description = "Add a shopping list or task description.";
      }
      if (snapshot.errandCategory === "personal_shopper" && (!snapshot.basketValue || snapshot.basketValue <= 0)) {
        errors.budget = "Enter a budget estimate for shopping errands.";
      }
      break;
    }
    case "ride": {
      if (!snapshot.rideSubType) {
        errors.rideType = "Select a ride type.";
      }
      break;
    }
    case "delivery": {
      const desc = snapshot.errandDescription?.trim() ?? snapshot.movingNotes?.trim() ?? "";
      if (!desc) {
        errors.parcel = "Add parcel or delivery instructions.";
      }
      break;
    }
    case "truck": {
      if (!snapshot.truckSizeId) {
        errors.truckSize = "Select a truck size.";
      }
      if (!snapshot.movingNotes?.trim()) {
        errors.movingDetails = "Describe what you are moving.";
      }
      break;
    }
    default:
      break;
  }

  if (snapshot.scheduleMode === "later") {
    if (!snapshot.scheduledAt || snapshot.scheduledAt <= Date.now()) {
      errors.schedule = "Choose a future date and time.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export function validateErrandDetailsStep(snapshot: BookingSnapshot): BookingValidationResult {
  const errors: Record<string, string> = {};
  if (!snapshot.errandCategory) {
    errors.errandType = "Select an errand type.";
  }
  const desc = snapshot.errandDescription?.trim() ?? "";
  const store = snapshot.storePreference?.trim() ?? "";
  if (!desc && !store) {
    errors.description = "Add a shopping list or task description.";
  }
  if (snapshot.errandCategory === "shopping" && (!snapshot.basketValue || snapshot.basketValue <= 0)) {
    errors.budget = "Enter a budget estimate for shopping errands.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function validateDeliveryStep(
  pickupAddress: string,
  recipientAddress: string,
  instructions: string,
): BookingValidationResult {
  const errors: Record<string, string> = {};
  if (!pickupAddress.trim()) errors.pickup = "Pickup address is required.";
  if (!recipientAddress.trim()) errors.dropoff = "Recipient address is required.";
  if (!instructions.trim()) errors.parcel = "Add delivery instructions or parcel details.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function validateMovingStep(
  snapshot: Pick<BookingSnapshot, "truckSizeId" | "movingNotes" | "pickup" | "destination">,
): BookingValidationResult {
  const errors: Record<string, string> = {};
  if (!snapshot.truckSizeId) errors.truckSize = "Select a truck size first.";
  if (!snapshot.pickup?.label?.trim()) errors.pickup = "Set a pickup location.";
  if (!snapshot.destination?.label?.trim()) errors.dropoff = "Set a drop-off location.";
  if (!snapshot.movingNotes?.trim()) errors.movingDetails = "Describe what you are moving.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}
