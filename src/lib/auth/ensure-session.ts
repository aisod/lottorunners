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

function storageHasSupabaseAuthKey(storage: Storage): boolean {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter((key): key is string => key != null)
    .some(
      (key) =>
        key === "supabase.auth.token" ||
        (key.startsWith("sb-") && key.includes("auth-token")),
    );
}

/** Whether Supabase auth tokens are persisted (refresh may still be in flight). */
export function hasSupabaseAuthStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (storageHasSupabaseAuthKey(window.localStorage)) return true;
    if (typeof window.sessionStorage !== "undefined") {
      return storageHasSupabaseAuthKey(window.sessionStorage);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * True only when there is no JWT and no persisted Supabase auth (safe to clear lr-auth-session).
 * Skips while rate-limited or refresh may still be in flight.
 */
export async function isCloudAuthAbsent(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (isSupabaseAuthRateLimited()) return false;
  if (hasSupabaseAuthStorage()) return false;

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  const { data: { session } } = await supabase.auth.getSession();
  return !session?.access_token;
}

/** True when a JWT access token is available for REST/RPC calls. */
export async function hasSupabaseAccessToken(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return Boolean(session?.access_token);
}

/**
 * Wait for Supabase JWT after refresh (avoids false "session expired" redirects).
 * For API calls, requires a real access_token (not just lr-auth or storage).
 */
export async function waitForSupabaseSession(maxMs = 4000): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session?.access_token) {
      markSupabaseAuthVerified();
      return true;
    }

    if (error && isRateLimitError(error.message)) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      // Client may still attach a cached token from storage while refresh is throttled.
      return hasSupabaseAuthStorage() && Boolean(getAuthSession());
    }

    if (!hasSupabaseAuthStorage() && !getAuthSession()) return false;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return hasSupabaseAccessToken();
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
    return hasSupabaseAccessToken();
  }

  if (isSupabaseAuthRateLimited()) {
    return hasSupabaseAccessToken();
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
