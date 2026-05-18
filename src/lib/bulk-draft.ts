import { create } from "zustand";

/** Corporate bulk request: service category from the bulk flow. */
export type BulkFlowService = "errand" | "delivery" | "truck";

export type BulkDraftStop = {
  id: string;
  pickup: string;
  dropoff: string;
  note: string;
};

type BulkDraftState = {
  service: BulkFlowService | null;
  stops: BulkDraftStop[];
  /** Called when leaving import for review with validated rows only. */
  setDraft: (service: BulkFlowService, stops: BulkDraftStop[]) => void;
  clearDraft: () => void;
};

export const useBulkDraft = create<BulkDraftState>((set) => ({
  service: null,
  stops: [],
  setDraft: (service, stops) => set({ service, stops }),
  clearDraft: () => set({ service: null, stops: [] }),
}));
