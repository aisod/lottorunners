/** Lovable Cloud / Supabase: URL + anon or publishable key (see .env.example). */

export function getSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && typeof url === "string" ? url : undefined;
}

/** Accepts Lovable's `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy `VITE_SUPABASE_ANON_KEY`. */
export function getSupabaseAnonKey(): string | undefined {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anon && typeof anon === "string") return anon;

  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (publishable && typeof publishable === "string") return publishable;

  return undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** Public app origin for auth email redirects (must match Supabase URL allow list). */
export function getAppPublicOrigin(): string {
  const configured = import.meta.env.VITE_APP_URL;
  if (configured && typeof configured === "string") {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/** Offline localStorage auth only when cloud is off and explicitly allowed (dev). */
export function isLocalDevAuthAllowed(): boolean {
  if (isSupabaseConfigured()) return false;
  return import.meta.env.VITE_ALLOW_LOCAL_DEV === "true";
}

export type DataSyncMode = "cloud" | "local-only";

export function getDataSyncMode(): DataSyncMode {
  return isSupabaseConfigured() ? "cloud" : "local-only";
}

/** Comma-separated admin emails (local hint only — Supabase `app_config.admin_emails` is source of truth). */
export function getAdminBootstrapEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
