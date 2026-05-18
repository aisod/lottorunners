import { smsHref, telHref } from "./phone-utils";

export function openPhoneCall(phone: string | undefined | null): boolean {
  const href = telHref(phone);
  if (!href || typeof window === "undefined") return false;
  window.location.href = href;
  return true;
}

export function openPhoneSms(phone: string | undefined | null): boolean {
  const href = smsHref(phone);
  if (!href || typeof window === "undefined") return false;
  window.location.href = href;
  return true;
}
