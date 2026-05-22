import { getAuthSession } from "@/lib/auth-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_CACHE_MS = 45_000;
const RATE_LIMIT_BACKOFF_MS = 90_000;

let lastVerifiedAt = 0;
let rateLimitedUntil = 0;

function isRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("429") || m.includes("rate limit") || m.includes("too many");
}

/** True while we should avoid extra auth calls and must not sign the user out. */
export function isSupabaseAuthRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

export function markSupabaseAuthVerified(): void {
  lastVerifiedAt = Date.now();
  rateLimitedUntil = 0;
}

export function resetSupabaseAuthCache(): void {
  lastVerifiedAt = 0;
  rateLimitedUntil = 0;
}

/** Whether Supabase auth tokens are persisted (refresh may still be in flight). */
export function hasSupabaseAuthStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(window.localStorage).some(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
  } catch {
    return false;
  }
}

/**
 * Ensures a valid Supabase JWT before protected API calls.
 * Uses getSession only (no manual refreshSession) to avoid 429 loops.
 * Never clears lr-auth-session-v1 — logout is explicit only.
 */
export async function ensureSupabaseAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const now = Date.now();
  if (lastVerifiedAt && now - lastVerifiedAt < SESSION_CACHE_MS) {
    return true;
  }

  if (isSupabaseAuthRateLimited()) {
    return Boolean(getAuthSession()) || hasSupabaseAuthStorage();
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error && isRateLimitError(error.message)) {
    rateLimitedUntil = now + RATE_LIMIT_BACKOFF_MS;
    return Boolean(getAuthSession()) || hasSupabaseAuthStorage();
  }

  if (session?.access_token) {
    markSupabaseAuthVerified();
    return true;
  }

  if (hasSupabaseAuthStorage() && getAuthSession()) {
    return false;
  }

  return false;
}
