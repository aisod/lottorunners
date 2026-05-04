import { create } from "zustand";
import type { LatLng, PaymentMethod, RequestStatus, Runner, ServiceType, TripRequest } from "./types";
import { estimateFare, haversine, SERVICES } from "./services";
import { estimateErrandPrice, type ErrandCategoryId, type PriceQuote } from "./errand-categories";

interface AppState {
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

  basketValue: number;
  setBasketValue: (n: number) => void;

  durationMin: number;
  setDurationMin: (n: number) => void;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (p: PaymentMethod) => void;

  status: RequestStatus;
  setStatus: (s: RequestStatus) => void;

  activeTrip: TripRequest | null;
  setActiveTrip: (t: TripRequest | null) => void;
  updateRunnerPosition: (pos: LatLng) => void;

  history: TripRequest[];
  pushHistory: (t: TripRequest) => void;

  buildEstimate: () => { fare: number; distanceKm: number; etaMin: number; quote?: PriceQuote } | null;
  reset: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  userLocation: null,
  setUserLocation: (l) => set({ userLocation: l }),

  selectedService: null,
  setSelectedService: (s) => set({ selectedService: s }),

  pickup: null,
  destination: null,
  setPickup: (p) => set({ pickup: p }),
  setDestination: (d) => set({ destination: d }),

  errandDescription: "",
  setErrandDescription: (s) => set({ errandDescription: s }),

  errandCategory: null,
  setErrandCategory: (c) => set({ errandCategory: c }),

  basketValue: 0,
  setBasketValue: (n) => set({ basketValue: n }),

  durationMin: 30,
  setDurationMin: (n) => set({ durationMin: n }),

  paymentMethod: "momo",
  setPaymentMethod: (p) => set({ paymentMethod: p }),

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

  history: [],
  pushHistory: (t) => set((st) => ({ history: [t, ...st.history] })),

  buildEstimate: () => {
    const { pickup, destination, selectedService, errandCategory, basketValue, durationMin } = get();
    if (!pickup || !destination || !selectedService) return null;
    const distanceKm = haversine(pickup.coord, destination.coord);
    const etaMin = Math.max(2, Math.round(SERVICES[selectedService].etaMin + distanceKm * 1.6));

    if (selectedService === "errand" && errandCategory) {
      const quote = estimateErrandPrice(errandCategory, distanceKm, { basketValue, durationMin });
      return { fare: quote.amount, distanceKm, etaMin, quote };
    }

    const fare = estimateFare(selectedService, distanceKm);
    return { fare, distanceKm, etaMin };
  },

  reset: () =>
    set({
      selectedService: null,
      pickup: null,
      destination: null,
      errandDescription: "",
      errandCategory: null,
      basketValue: 0,
      durationMin: 30,
      paymentMethod: "momo",
      status: "idle",
      activeTrip: null,
    }),
}));
