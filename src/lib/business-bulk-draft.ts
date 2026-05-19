import type { ServiceType } from "./types";

export type BusinessBulkDraftStop = {
  address: string;
  notes: string;
};

export type BusinessBulkDraft = {
  batchName: string;
  pickupAddress: string;
  serviceType: ServiceType;
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

    const serviceType =
      parsedDraft.serviceType === "errand" ||
      parsedDraft.serviceType === "delivery" ||
      parsedDraft.serviceType === "truck" ||
      parsedDraft.serviceType === "ride"
        ? parsedDraft.serviceType
        : "delivery";

    return {
      batchName: typeof parsedDraft.batchName === "string" ? parsedDraft.batchName : "Untitled batch",
      pickupAddress: typeof parsedDraft.pickupAddress === "string" ? parsedDraft.pickupAddress : "",
      serviceType,
      stops: parsedDraft.stops.map((stop) => ({
        address: typeof stop?.address === "string" ? stop.address : "",
        notes: typeof stop?.notes === "string" ? stop.notes : "",
      })),
      fromImport: parsedDraft.fromImport === true,
    };
  } catch {
    return null;
  }
}

/** Parse CSV text: address[,notes] per row; optional header row with "address". */
export function parseBusinessBulkCsv(text: string): BusinessBulkDraftStop[] {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const first = lines[0].toLowerCase();
  const startIndex = first.includes("address") ? 1 : 0;

  const stops: BusinessBulkDraftStop[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const address = parts[0] ?? "";
    if (address.length < 3) continue;
    stops.push({ address, notes: parts[1] ?? "" });
  }

  return stops.slice(0, 500);
}
