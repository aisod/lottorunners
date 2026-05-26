import { getAuthSession } from "./auth-session";
import { getSupabaseUserId } from "./auth-users";
import { mergeRemoteDocuments, fetchRemoteDocuments } from "./supabase/profiles-remote";
import { isSupabaseConfigured } from "./supabase/config";
import { getSupabaseClient } from "./supabase/client";

export type BusinessProfileSettings = {
  company: string;
  vat: string;
  billingEmail: string;
  costCenter: string;
  policy: string;
};

const KEY_PREFIX = "lr-business-profile-v1:";

const DOC_KEYS = {
  company: "business_company",
  vat: "business_vat",
  billingEmail: "business_billing_email",
  costCenter: "business_cost_center",
  policy: "business_policy",
} as const;

function storageKey(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function defaultsForSession(): BusinessProfileSettings {
  const session = getAuthSession();
  const email = session?.email ?? "";
  return {
    company: session?.email?.split("@")[1] ?? "Business account",
    vat: "",
    billingEmail: email,
    costCenter: "",
    policy: "Require approval for bulk batches over N$ 25,000.",
  };
}

function fromDocuments(docs: Record<string, string>): Partial<BusinessProfileSettings> {
  return {
    company: docs[DOC_KEYS.company],
    vat: docs[DOC_KEYS.vat],
    billingEmail: docs[DOC_KEYS.billingEmail],
    costCenter: docs[DOC_KEYS.costCenter],
    policy: docs[DOC_KEYS.policy],
  };
}

function toDocuments(settings: BusinessProfileSettings): Record<string, string> {
  return {
    [DOC_KEYS.company]: settings.company,
    [DOC_KEYS.vat]: settings.vat,
    [DOC_KEYS.billingEmail]: settings.billingEmail,
    [DOC_KEYS.costCenter]: settings.costCenter,
    [DOC_KEYS.policy]: settings.policy,
  };
}

function readLocal(email: string): BusinessProfileSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return { ...defaultsForSession(), ...JSON.parse(raw) } as BusinessProfileSettings;
  } catch {
    return null;
  }
}

function writeLocal(email: string, settings: BusinessProfileSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(email), JSON.stringify(settings));
}

export async function loadBusinessProfile(): Promise<BusinessProfileSettings> {
  const session = getAuthSession();
  const email = session?.email ?? "";
  const defaults = defaultsForSession();

  if (!email) return defaults;

  const local = readLocal(email);
  if (!isSupabaseConfigured()) {
    return local ?? defaults;
  }

  const userId = await getSupabaseUserId();
  if (!userId) {
    return local ?? defaults;
  }

  const remote = await fetchRemoteDocuments(userId);
  const fromCloud = fromDocuments(remote);
  const hasCloud = Object.values(fromCloud).some((v) => v != null && String(v).trim() !== "");

  if (hasCloud) {
    const merged = { ...defaults, ...fromCloud };
    writeLocal(email, merged);
    return merged;
  }

  return local ?? defaults;
}

export async function saveBusinessProfile(
  settings: BusinessProfileSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = getAuthSession();
  if (!session?.email) {
    return { ok: false, error: "Not signed in." };
  }

  if (!isSupabaseConfigured()) {
    writeLocal(session.email, settings);
    return { ok: true };
  }

  const userId = await getSupabaseUserId();
  if (!userId) {
    return { ok: false, error: "Could not resolve your Supabase account. Sign in again." };
  }

  const docOk = await mergeRemoteDocuments(userId, toDocuments(settings));
  if (!docOk) {
    return { ok: false, error: "Could not save business profile to the server." };
  }

  const supabase = getSupabaseClient();
  if (supabase && settings.company.trim()) {
    await supabase
      .from("profiles")
      .update({
        display_name: settings.company.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  writeLocal(session.email, settings);
  return { ok: true };
}
