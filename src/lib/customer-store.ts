import { create } from "zustand";
import type {
  LatLng,
  PaymentMethod,
  RequestStatus,
  ScheduleMode,
  ServiceType,
  TripRequest,
  TruckSizeId,
} from "./types";
import {
  estimateFare,
  haversine,
  SERVICES,
  getTruckExtraHelperFeeNad,
  getTruckLabourFeeNad,
  getTruckSizeBaseNad,
} from "./services";
import type { CargoPhotoSlotId, CargoPhotoUrls } from "./cargo-photos";
import { estimateErrandPrice, type ErrandCategoryId, type PriceQuote } from "./errand-categories";
import {
  clearCustomerBookingDraft,
  loadCustomerBookingDraft,
  saveCustomerBookingDraft,
  type CustomerBookingDraft,
} from "./customer-booking-draft";
import { loadCustomerTripHistory, saveCustomerTripHistory } from "./customer-history-storage";
import {
  completeJobWithRating,
  getCurrentCustomerId,
  getJob,
  jobToTripRequest,
} from "./jobs-service";

const initialDraft = typeof window !== "undefined" ? loadCustomerBookingDraft() : null;

function draftSnapshot(state: CustomerAppState): CustomerBookingDraft {
  return {
    selectedService: state.selectedService,
    pickup: state.pickup,
    destination: state.destination,
    errandDescription: state.errandDescription,
    errandCategory: state.errandCategory,
    storePreference: state.storePreference,
    basketValue: state.basketValue,
    durationMin: state.durationMin,
    truckSizeId: state.truckSizeId,
    truckLabour: state.truckLabour,
    truckExtraHelpers: state.truckExtraHelpers,
    movingNotes: state.movingNotes,
    cargoPhotos: state.cargoPhotos,
    paymentMethod: state.paymentMethod,
    rideSubType: state.rideSubType,
    scheduleMode: state.scheduleMode,
    scheduledAt: state.scheduledAt,
  };
}

export interface CustomerAppState {
  userLocation: LatLng | null;
  setUserLocation: (l: LatLng) => void;

  selectedService: ServiceType | null;
  setSelectedService: (s: ServiceType | null) => void;

  pickup: { coord: LatLng; label: string } | null;
  destination: { coord: LatLng; label: string } | null;
  setPickup: (p: { coord: LatLng; label: string } | null) => void;
  setDestination: (d: { coord: LatLng; label: string } | null) => void;

  errandDescription: string;
  setErrandDescription: (s: string) => void;

  errandCategory: ErrandCategoryId | null;
  setErrandCategory: (c: ErrandCategoryId | null) => void;
  storePreference: string;
  setStorePreference: (s: string) => void;

  basketValue: number;
  setBasketValue: (n: number) => void;

  durationMin: number;
  setDurationMin: (n: number) => void;

  truckSizeId: TruckSizeId | null;
  setTruckSizeId: (id: TruckSizeId | null) => void;
  truckLabour: boolean;
  setTruckLabour: (on: boolean) => void;
  truckExtraHelpers: number;
  setTruckExtraHelpers: (n: number) => void;
  movingNotes: string;
  setMovingNotes: (s: string) => void;

  cargoPhotos: CargoPhotoUrls;
  setCargoPhoto: (slot: CargoPhotoSlotId, url: string | null) => void;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (p: PaymentMethod) => void;

  rideSubType: string | null;
  setRideSubType: (id: string | null) => void;

  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;

  scheduleMode: ScheduleMode;
  setScheduleMode: (mode: ScheduleMode) => void;
  scheduledAt: number | null;
  setScheduledAt: (at: number | null) => void;

  status: RequestStatus;
  setStatus: (s: RequestStatus) => void;

  activeTrip: TripRequest | null;
  setActiveTrip: (t: TripRequest | null) => void;
  updateRunnerPosition: (pos: LatLng) => void;

  history: TripRequest[];
  pushHistory: (t: TripRequest) => void;
  hydrateHistory: () => void;
  hydrateBookingDraft: () => void;

  buildEstimate: () => { fare: number; distanceKm: number; etaMin: number; quote?: PriceQuote } | null;
  ensureRoute: () => void;
  completeBooking: (rating?: number) => void;
  restoreHomeUi: () => void;
  reset: () => void;
}

export const useCustomerApp = create<CustomerAppState>((set, get) => ({
  userLocation: null,
  setUserLocation: (l) => set({ userLocation: l }),

  selectedService: initialDraft?.selectedService ?? null,
  setSelectedService: (s) => set({ selectedService: s }),

  pickup: initialDraft?.pickup ?? null,
  destination: initialDraft?.destination ?? null,
  setPickup: (p) => set({ pickup: p }),
  setDestination: (d) => set({ destination: d }),

  errandDescription: initialDraft?.errandDescription ?? "",
  setErrandDescription: (s) => set({ errandDescription: s }),

  errandCategory: initialDraft?.errandCategory ?? null,
  setErrandCategory: (c) => set({ errandCategory: c }),
  storePreference: initialDraft?.storePreference ?? "",
  setStorePreference: (s) => set({ storePreference: s }),

  basketValue: initialDraft?.basketValue ?? 0,
  setBasketValue: (n) => set({ basketValue: n }),

  durationMin: initialDraft?.durationMin ?? 30,
  setDurationMin: (n) => set({ durationMin: n }),

  truckSizeId: initialDraft?.truckSizeId ?? "small",
  setTruckSizeId: (id) => set({ truckSizeId: id }),
  truckLabour: initialDraft?.truckLabour ?? false,
  setTruckLabour: (on) => set({ truckLabour: on }),
  truckExtraHelpers: initialDraft?.truckExtraHelpers ?? 0,
  setTruckExtraHelpers: (n) =>
    set({ truckExtraHelpers: Math.max(0, Math.min(2, Math.round(n))) }),
  movingNotes: initialDraft?.movingNotes ?? "",
  setMovingNotes: (s) => set({ movingNotes: s }),

  cargoPhotos: initialDraft?.cargoPhotos ?? {},
  setCargoPhoto: (slot, url) =>
    set((s) => {
      const next = { ...s.cargoPhotos };
      if (url) next[slot] = url;
      else delete next[slot];
      return { cargoPhotos: next };
    }),

  paymentMethod: initialDraft?.paymentMethod ?? "momo",
  setPaymentMethod: (p) => set({ paymentMethod: p }),

  rideSubType: initialDraft?.rideSubType ?? null,
  setRideSubType: (id) => set({ rideSubType: id }),

  activeJobId: null,
  setActiveJobId: (id) => set({ activeJobId: id }),

  scheduleMode: initialDraft?.scheduleMode ?? "now",
  setScheduleMode: (mode) => set({ scheduleMode: mode, ...(mode === "now" ? { scheduledAt: null } : {}) }),
  scheduledAt: initialDraft?.scheduledAt ?? null,
  setScheduledAt: (at) => set({ scheduledAt: at }),

  status: "idle",
  setStatus: (s) => set({ status: s }),

  activeTrip: null,
  setActiveTrip: (t) => set({ activeTrip: t }),
  updateRunnerPosition: (pos) =>
    set((st) => {
      if (!st.activeTrip || !st.activeTrip.runner) return st;
      return {
        activeTrip: {
          ...st.activeTrip,
          runner: { ...st.activeTrip.runner, position: pos },
        },
      };
    }),

  history: typeof window !== "undefined" ? loadCustomerTripHistory() : [],
  pushHistory: (t) =>
    set((st) => {
      const history = [t, ...st.history];
      saveCustomerTripHistory(history);
      return { history };
    }),
  hydrateHistory: () => {
    const stored = loadCustomerTripHistory();
    if (stored.length > 0) {
      set({ history: stored });
    }
  },
  hydrateBookingDraft: () => {
    const draft = loadCustomerBookingDraft();
    if (!draft) return;
    set({
      selectedService: draft.selectedService,
      pickup: draft.pickup,
      destination: draft.destination,
      errandDescription: draft.errandDescription,
      errandCategory: draft.errandCategory,
      storePreference: draft.storePreference,
      basketValue: draft.basketValue,
      durationMin: draft.durationMin,
      truckSizeId: draft.truckSizeId,
      truckLabour: draft.truckLabour,
      truckExtraHelpers: draft.truckExtraHelpers,
      movingNotes: draft.movingNotes,
      cargoPhotos: draft.cargoPhotos ?? {},
      paymentMethod: draft.paymentMethod,
      rideSubType: draft.rideSubType ?? null,
      scheduleMode: draft.scheduleMode ?? "now",
      scheduledAt: draft.scheduledAt ?? null,
    });
  },

  buildEstimate: () => {
    const {
      pickup,
      destination,
      selectedService,
      errandCategory,
      basketValue,
      durationMin,
      truckSizeId,
      truckLabour,
      truckExtraHelpers,
    } = get();
    if (!pickup || !destination || !selectedService) return null;
    const distanceKm = haversine(pickup.coord, destination.coord);
    const etaMin = Math.max(2, Math.round(SERVICES[selectedService].etaMin + distanceKm * 1.6));

    if (selectedService === "errand" && errandCategory) {
      const quote = estimateErrandPrice(errandCategory, distanceKm, { basketValue, durationMin });
      return { fare: quote.amount, distanceKm, etaMin, quote };
    }

    if (selectedService === "truck") {
      const tier = truckSizeId ?? "small";
      const base = getTruckSizeBaseNad()[tier];
      const labour = truckLabour ? getTruckLabourFeeNad() : 0;
      const helpers = truckExtraHelpers * getTruckExtraHelperFeeNad();
      const distanceComponent = SERVICES.truck.perKm * Math.max(distanceKm, 0.5);
      const fare = Math.round(base + distanceComponent + labour + helpers);
      const etaBoost = tier === "large" ? 12 : tier === "medium" ? 6 : 0;
      return { fare, distanceKm, etaMin: etaMin + etaBoost };
    }

    const fare = estimateFare(selectedService, distanceKm);
    return { fare, distanceKm, etaMin };
  },

  ensureRoute: () => {
    /* No-op: real coordinates must come from geocoding or the home map. */
  },

  completeBooking: (rating) => {
    const { activeJobId } = get();
    if (activeJobId) {
      const customerId = getCurrentCustomerId();
      if (customerId) {
        const job = completeJobWithRating(activeJobId, customerId, rating ?? 5) ?? getJob(activeJobId);
        if (job && job.status === "completed") {
          const trip = jobToTripRequest(job);
          set((s) => {
            const history = [trip, ...s.history.filter((h) => h.id !== job.id)];
            saveCustomerTripHistory(history);
            return { history };
          });
        }
      }
    } else {
      const {
        pickup,
        destination,
        selectedService,
        errandDescription,
        errandCategory,
        basketValue,
        durationMin,
        paymentMethod,
        scheduleMode,
        scheduledAt,
      } = get();
      if (!pickup || !destination || !selectedService) return;

      const estimate = get().buildEstimate();
      const trip: TripRequest = {
        id: `lr-${Date.now()}`,
        service: selectedService,
        pickup: pickup.coord,
        pickupLabel: pickup.label,
        destination: destination.coord,
        destinationLabel: destination.label,
        errandDescription: errandDescription || undefined,
        errandCategory: errandCategory ?? undefined,
        basketValue,
        durationMin,
        fare: estimate?.fare ?? 95,
        distanceKm: estimate?.distanceKm ?? 0,
        etaMin: estimate?.etaMin ?? 10,
        payment: paymentMethod,
        status: "rated",
        rating,
        createdAt: Date.now(),
        scheduledAt: scheduleMode === "later" && scheduledAt ? scheduledAt : undefined,
      };

      set((s) => {
        const history = [trip, ...s.history];
        saveCustomerTripHistory(history);
        return { history };
      });
    }
    get().reset();
  },

  restoreHomeUi: () => set({ status: "idle" }),

  reset: () => {
    clearCustomerBookingDraft();
    set({
      selectedService: null,
      pickup: null,
      destination: null,
      errandDescription: "",
      errandCategory: null,
      storePreference: "",
      basketValue: 0,
      durationMin: 30,
      truckSizeId: "small",
      truckLabour: false,
      truckExtraHelpers: 0,
      movingNotes: "",
      cargoPhotos: {},
      paymentMethod: "momo",
      scheduleMode: "now",
      scheduledAt: null,
      status: "idle",
      activeTrip: null,
      activeJobId: null,
      rideSubType: null,
    });
  },
}));

if (typeof window !== "undefined") {
  useCustomerApp.subscribe((state) => {
    if (!state.selectedService && !state.pickup) return;
    saveCustomerBookingDraft(draftSnapshot(state));
  });
}
