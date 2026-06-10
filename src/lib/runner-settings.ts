import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALL_RIDE_CATEGORIES, normalizeRideCategories, type RideCategoryId } from "./ride-categories";

/** Runner onboarding: which customer-facing services this runner offers. */
export type RunnerOfferedServiceId = "taxi" | "delivery" | "errand" | "truck";

/** Match common business bulk default (`delivery`) and customer services. */
const DEFAULT_SELECTED: RunnerOfferedServiceId[] = ["taxi", "delivery", "errand", "truck"];

interface RunnerSettingsState {
  selectedServiceIds: RunnerOfferedServiceId[];
  rideCategories: RideCategoryId[];
  setSelectedServiceIds: (ids: RunnerOfferedServiceId[]) => void;
  setRideCategories: (ids: RideCategoryId[]) => void;
  toggleOfferedService: (id: RunnerOfferedServiceId) => void;
  toggleRideCategory: (id: RideCategoryId) => void;
}

export const useRunnerSettings = create<RunnerSettingsState>()(
  persist(
    (set, get) => ({
      selectedServiceIds: DEFAULT_SELECTED,
      rideCategories: [...ALL_RIDE_CATEGORIES],
      setSelectedServiceIds: (ids) => set({ selectedServiceIds: ids }),
      setRideCategories: (ids) =>
        set({ rideCategories: normalizeRideCategories(ids) }),
      toggleOfferedService: (id) => {
        const cur = get().selectedServiceIds;
        const next = new Set(cur);
        if (next.has(id)) {
          if (next.size <= 1) return;
          next.delete(id);
        } else {
          next.add(id);
        }
        set({ selectedServiceIds: Array.from(next) });
      },
      toggleRideCategory: (id) => {
        const cur = new Set(get().rideCategories);
        if (cur.has(id)) {
          if (cur.size <= 1) return;
          cur.delete(id);
        } else {
          cur.add(id);
        }
        set({ rideCategories: normalizeRideCategories(Array.from(cur)) });
      },
    }),
    { name: "lottorunners-runner-services-v1" },
  ),
);

export function runnerOffersTaxi(selectedServiceIds: RunnerOfferedServiceId[]): boolean {
  return selectedServiceIds.includes("taxi");
}
