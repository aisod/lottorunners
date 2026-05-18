import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Runner onboarding: which customer-facing services this runner offers. */
export type RunnerOfferedServiceId = "taxi" | "delivery" | "errand" | "truck";

const DEFAULT_SELECTED: RunnerOfferedServiceId[] = ["taxi"];

interface RunnerSettingsState {
  selectedServiceIds: RunnerOfferedServiceId[];
  setSelectedServiceIds: (ids: RunnerOfferedServiceId[]) => void;
  toggleOfferedService: (id: RunnerOfferedServiceId) => void;
}

export const useRunnerSettings = create<RunnerSettingsState>()(
  persist(
    (set, get) => ({
      selectedServiceIds: DEFAULT_SELECTED,
      setSelectedServiceIds: (ids) => set({ selectedServiceIds: ids }),
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
    }),
    { name: "lottorunners-runner-services-v1" },
  ),
);
