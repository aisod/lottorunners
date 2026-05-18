const PAYMENT_CARD_KEY = "lr-customer-payment-card-v1";

export interface SavedPaymentCard {
  cardholder: string;
  cardNumber: string;
  expiry: string;
  saveForNextTime: boolean;
}

export function loadSavedPaymentCard(): SavedPaymentCard | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PAYMENT_CARD_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SavedPaymentCard>;
    if (!parsed.cardholder || !parsed.cardNumber) return null;
    return {
      cardholder: parsed.cardholder,
      cardNumber: parsed.cardNumber,
      expiry: parsed.expiry ?? "",
      saveForNextTime: parsed.saveForNextTime ?? true,
    };
  } catch {
    return null;
  }
}

export function savePaymentCard(card: SavedPaymentCard): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAYMENT_CARD_KEY, JSON.stringify(card));
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 4) return "•••• •••• •••• ••••";
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}
