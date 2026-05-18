// Errand sub-categories shown after the user picks "Errand Runner".
// Each has its own pricing model and produces a *price range* (low–high)
// because effort/time on these tasks is inherently variable.

export type ErrandCategoryId =
  | "personal_shopper"
  | "delivery"
  | "queue_sitting"
  | "documents"
  | "pharmacy_runs"
  | "special_runs"
  | "other";

export interface ErrandCategory {
  id: ErrandCategoryId;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  // Pricing model — used to compute a low/high range in NAD.
  pricing: {
    base: number;
    perKm?: number;        // distance component
    perHalfHour?: number;  // time-based component (queue sitting)
    pctOfBasket?: number;  // % of declared basket value (shopper)
    minRange: number;      // safety floor for the low end
  };
  // Field hints shown in the details form.
  detailsPlaceholder: string;
  needsBasketValue?: boolean;   // shopper
  needsDuration?: boolean;      // queue sitting
}

export const ERRAND_CATEGORIES: Record<ErrandCategoryId, ErrandCategory> = {
  personal_shopper: {
    id: "personal_shopper",
    label: "Personal Shopper",
    tagline: "We shop, you relax",
    description:
      "We go to any shop, retail or warehouse and buy what's on your list. Photo confirmation and receipt included.",
    icon: "🛍️",
    pricing: { base: 60, perKm: 8, pctOfBasket: 0.1, minRange: 80 },
    detailsPlaceholder:
      "e.g. Checkers Maerua: 2L milk, bread, eggs, washing powder. Prefer Omo if available.",
    needsBasketValue: true,
  },
  delivery: {
    id: "delivery",
    label: "Delivery Service",
    tagline: "Parcels & documents, fast",
    description:
      "Reliable pickup and drop-off of parcels, documents and business packages across Namibia.",
    icon: "📦",
    pricing: { base: 30, perKm: 10, minRange: 45 },
    detailsPlaceholder:
      "e.g. A4 envelope with contracts. Hand to receptionist, ask for Maria.",
  },
  queue_sitting: {
    id: "queue_sitting",
    label: "Queue Sitting",
    tagline: "We wait so you don't",
    description:
      "We hold your spot at banks, government offices and stores. Save your valuable time.",
    icon: "🪑",
    pricing: { base: 50, perHalfHour: 25, perKm: 4, minRange: 70 },
    detailsPlaceholder:
      "e.g. Home Affairs Windhoek — collect ID. I'll arrive at 11:30, please hold spot from 09:00.",
    needsDuration: true,
  },
  documents: {
    id: "documents",
    label: "Document Services",
    tagline: "Confidential admin runs",
    description:
      "Submission, verification and collection at Home Affairs, NATIS, NAMRA and more. Handled with care.",
    icon: "📄",
    pricing: { base: 150, perKm: 8, minRange: 160 },
    detailsPlaceholder:
      "e.g. NATIS — renew vehicle license disc, plate N123-456WB. Papers in sealed envelope.",
  },
  pharmacy_runs: {
    id: "pharmacy_runs",
    label: "Pharmacy Runs",
    tagline: "Rx and OTC pickup",
    description:
      "Prescription collection and over-the-counter medication delivery from pharmacies across Windhoek.",
    icon: "💊",
    pricing: { base: 55, perKm: 9, minRange: 65 },
    detailsPlaceholder:
      "e.g. Clicks Maerua — chronic medication for Maria K., script photo attached in chat.",
  },
  special_runs: {
    id: "special_runs",
    label: "Special Runs",
    tagline: "Bills, renewals & VIP help",
    description:
      "Utility bill payments, license renewals, and dedicated assistance for pensioners and persons with disabilities.",
    icon: "⭐",
    pricing: { base: 80, perKm: 8, minRange: 90 },
    detailsPlaceholder:
      "e.g. Pay City of Windhoek water bill (account #12345), then bring stamped receipt back home.",
  },
  other: {
    id: "other",
    label: "Other / Custom",
    tagline: "Tell us what you need",
    description:
      "Anything else? Describe the errand and we'll quote a fair price after a runner reviews it.",
    icon: "✨",
    pricing: { base: 70, perKm: 8, minRange: 80 },
    detailsPlaceholder:
      "e.g. Drop off birthday cake at office reception by 14:00 — fragile, keep upright.",
  },
};

export const ERRAND_CATEGORY_ORDER: ErrandCategoryId[] = [
  "personal_shopper",
  "delivery",
  "queue_sitting",
  "documents",
  "pharmacy_runs",
  "special_runs",
  "other",
];

/** Subset and display titles aligned with the Stitch “choose errand type” screen. */
export const CHOOSE_ERRAND_TYPE_ORDER: ErrandCategoryId[] = [
  "personal_shopper",
  "queue_sitting",
  "documents",
  "pharmacy_runs",
  "special_runs",
];

export const CHOOSE_ERRAND_TYPE_LABELS: Partial<Record<ErrandCategoryId, string>> = {
  special_runs: "Bill Payments",
};

export const CHOOSE_ERRAND_TYPE_DESCRIPTIONS: Partial<Record<ErrandCategoryId, string>> = {
  personal_shopper: "Groceries, gifts, or specific items picked up and delivered.",
  queue_sitting: "We hold your spot in line at banks, clinics, or government offices.",
  documents: "Secure pickup, submission, or stamping of important paperwork.",
  pharmacy_runs: "Prescription collection and over-the-counter medication delivery.",
  special_runs: "In-person municipal, utility, or agency bill payments handled for you.",
};

export interface PriceQuote {
  amount: number;   // fixed price in NAD
  basis: string;    // short human explanation
}

export function estimateErrandPrice(
  categoryId: ErrandCategoryId,
  distanceKm: number,
  opts?: { basketValue?: number; durationMin?: number },
): PriceQuote {
  const cat = ERRAND_CATEGORIES[categoryId];
  const p = cat.pricing;
  const km = Math.max(distanceKm, 0.5);

  let total = p.base;

  if (p.perKm) {
    total += p.perKm * km;
  }

  if (p.perHalfHour) {
    const halfHours = Math.max(1, Math.ceil((opts?.durationMin ?? 30) / 30));
    total += p.perHalfHour * halfHours;
  }

  if (p.pctOfBasket && opts?.basketValue) {
    total += Math.min(p.pctOfBasket * opts.basketValue, 200);
  }

  // Round to nearest N$5 and enforce floor
  const amount = Math.max(p.minRange, Math.round(total / 5) * 5);

  const bits: string[] = [`Base N$ ${p.base}`];
  if (p.perKm) bits.push(`+ N$ ${p.perKm}/km`);
  if (p.perHalfHour) bits.push(`+ N$ ${p.perHalfHour}/30min`);
  if (p.pctOfBasket) bits.push(`+ ${Math.round(p.pctOfBasket * 100)}% of basket`);

  return { amount, basis: bits.join(" ") };
}

