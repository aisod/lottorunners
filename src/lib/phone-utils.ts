/** Normalize to E.164 for Namibia (+264 + 9-digit mobile, e.g. 81 825 3590). */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("264")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Namibian mobiles: 81/85/86 + 7 digits (9 digits after leading 0 is stripped).
  if (digits.length !== 9) return null;
  if (!/^8[156]\d{7}$/.test(digits)) return null;

  return `+264${digits}`;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone) ?? phone;
  if (!normalized.startsWith("+264") || normalized.length < 13) return phone;
  const local = normalized.slice(4);
  if (local.length !== 9) return normalized;
  return `+264 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

export function telHref(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  return normalized ? `tel:${normalized}` : null;
}

export function smsHref(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  return normalized ? `sms:${normalized}` : null;
}
