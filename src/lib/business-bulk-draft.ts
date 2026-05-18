export type BusinessBulkDraftStop = {
  address: string;
  notes: string;
};

export type BusinessBulkDraft = {
  batchName: string;
  stops: BusinessBulkDraftStop[];
  fromImport?: boolean;
};

const BUSINESS_BULK_DRAFT_KEY = "business-bulk-review-draft";

export function saveBusinessBulkDraft(draft: BusinessBulkDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(BUSINESS_BULK_DRAFT_KEY, JSON.stringify(draft));
}

export function loadBusinessBulkDraft(): BusinessBulkDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.sessionStorage.getItem(BUSINESS_BULK_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as Partial<BusinessBulkDraft>;
    if (!Array.isArray(parsedDraft.stops)) {
      return null;
    }

    return {
      batchName: typeof parsedDraft.batchName === "string" ? parsedDraft.batchName : "Untitled batch",
      stops: parsedDraft.stops.map((stop) => ({
        address: typeof stop?.address === "string" ? stop.address : "Address TBD",
        notes: typeof stop?.notes === "string" ? stop.notes : "",
      })),
      fromImport: parsedDraft.fromImport === true,
    };
  } catch {
    return null;
  }
}
