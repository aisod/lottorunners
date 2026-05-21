import { ERRAND_CATEGORIES, type ErrandCategoryId } from "./errand-categories";
import type { RouteStop } from "./geocode-address";
import { isValidRouteStop } from "./geocode-address";
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
  } else if (!isValidRouteStop(snapshot.pickup)) {
    errors.pickup = "Select a pickup location from search or the home map.";
  }

  const needsDropoff =
    snapshot.selectedService === "ride" ||
    snapshot.selectedService === "delivery" ||
    snapshot.selectedService === "truck" ||
    snapshot.selectedService === "errand";

  if (needsDropoff && !snapshot.destination?.label?.trim()) {
    errors.dropoff = "Drop-off address is required.";
  } else if (needsDropoff && !isValidRouteStop(snapshot.destination)) {
    errors.dropoff = "Select a drop-off location from search or the home map.";
  }

  if (!snapshot.paymentMethod) {
    errors.payment = "Select a payment method.";
  }

  switch (snapshot.selectedService) {
    case "errand": {
      if (!snapshot.errandCategory) {
        errors.errandType = "Select an errand type.";
      }
      const cat = snapshot.errandCategory ? ERRAND_CATEGORIES[snapshot.errandCategory] : null;
      const desc = snapshot.errandDescription?.trim() ?? "";
      const store = snapshot.storePreference?.trim() ?? "";
      if (!desc && !store) {
        errors.description = "Add a shopping list or task description.";
      }
      if (cat?.needsBasketValue && (!snapshot.basketValue || snapshot.basketValue <= 0)) {
        errors.budget = "Enter a budget estimate for this errand type.";
      }
      if (cat?.needsDuration && (!snapshot.durationMin || snapshot.durationMin <= 0)) {
        errors.duration = "Enter how long the runner should wait or hold the spot (minutes).";
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
  if (!snapshot.pickup?.label?.trim()) {
    errors.pickup = "Set a pickup location on the errand screen or home map.";
  } else if (!isValidRouteStop(snapshot.pickup)) {
    errors.pickup = "Pickup needs map coordinates — search an address or use the home map.";
  }
  if (!snapshot.destination?.label?.trim()) {
    errors.dropoff = "Set a destination on the errand type screen or home map.";
  } else if (!isValidRouteStop(snapshot.destination)) {
    errors.dropoff = "Destination needs coordinates — pick a search result or use the home map.";
  }
  if (!snapshot.errandCategory) {
    errors.errandType = "Select an errand type.";
  }
  const cat = snapshot.errandCategory ? ERRAND_CATEGORIES[snapshot.errandCategory] : null;
  const desc = snapshot.errandDescription?.trim() ?? "";
  const store = snapshot.storePreference?.trim() ?? "";
  if (!desc && !store) {
    errors.description = "Add a shopping list or task description.";
  }
  if (cat?.needsBasketValue && (!snapshot.basketValue || snapshot.basketValue <= 0)) {
    errors.budget = "Enter a budget estimate for this errand type.";
  }
  if (cat?.needsDuration && (!snapshot.durationMin || snapshot.durationMin <= 0)) {
    errors.duration = "Enter how long the runner should wait or hold the spot (minutes).";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function validateDeliveryStep(
  pickupStop: RouteStop | null,
  destinationStop: RouteStop | null,
  instructions: string,
): BookingValidationResult {
  const errors: Record<string, string> = {};
  if (!isValidRouteStop(pickupStop)) {
    errors.pickup = "Choose a pickup from search (or set a pin on the home map).";
  }
  if (!isValidRouteStop(destinationStop)) {
    errors.dropoff = "Choose a drop-off from search (or set a pin on the home map).";
  }
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
  else if (!isValidRouteStop(snapshot.pickup)) {
    errors.pickup = "Pickup needs map coordinates — search an address or use the home map.";
  }
  if (!snapshot.destination?.label?.trim()) errors.dropoff = "Set a drop-off location.";
  else if (!isValidRouteStop(snapshot.destination)) {
    errors.dropoff = "Drop-off needs map coordinates — search an address or use the home map.";
  }
  if (!snapshot.movingNotes?.trim()) errors.movingDetails = "Describe what you are moving.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}
