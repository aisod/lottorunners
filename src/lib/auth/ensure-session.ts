import { getAuthSession } from "@/lib/auth-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_CACHE_MS = 45_000;
const RATE_LIMIT_BACKOFF_MS = 120_000;

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

/** Call when Supabase auth returns HTTP 429 (refresh/sign-in rate limit). */
export function markSupabaseAuthRateLimited(durationMs = RATE_LIMIT_BACKOFF_MS): void {
  rateLimitedUntil = Date.now() + durationMs;
}

export function supabaseAuthRateLimitMessage(): string {
  return "Too many sign-in requests. Wait about a minute, then try again.";
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

type StoredSupabaseAuth = {
  access_token?: string;
  expires_at?: number;
  currentSession?: { access_token?: string; expires_at?: number };
};

/** Read JWT from localStorage without triggering Supabase auto-refresh (avoids 429 loops). */
export function readAccessTokenFromSupabaseStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith("sb-") || !key.includes("auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredSupabaseAuth;
      const session = parsed.currentSession ?? parsed;
      const token = session.access_token;
      if (!token) continue;
      const expiresAt = session.expires_at;
      if (typeof expiresAt === "number" && expiresAt * 1000 < Date.now() + 60_000) {
        continue;
      }
      return token;
    }
  } catch {
    return null;
  }
  return null;
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

/** True when a JWT access token is available for REST/RPC calls. */
export async function hasSupabaseAccessToken(): Promise<boolean> {
  if (isSupabaseAuthRateLimited()) {
    return Boolean(readAccessTokenFromSupabaseStorage());
  }
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return Boolean(session?.access_token);
}

/**
 * True when there is no usable JWT (safe to clear lr-auth and send user to sign-in).
 * Orphan sb-* keys without a token count as absent.
 */
export async function isCloudAuthAbsent(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (isSupabaseAuthRateLimited()) return false;
  return !(await hasSupabaseAccessToken());
}

/**
 * Wait for Supabase JWT after refresh (avoids false "session expired" redirects).
 */
export async function waitForSupabaseSession(maxMs = 4000): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (!isSupabaseConfigured()) return true;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (isSupabaseAuthRateLimited()) {
      return Boolean(readAccessTokenFromSupabaseStorage());
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (session?.access_token) {
      markSupabaseAuthVerified();
      return true;
    }

    if (error && isRateLimitError(error.message)) {
      markSupabaseAuthRateLimited();
      return hasSupabaseAccessToken();
    }

    if (!hasSupabaseAuthStorage() && !getAuthSession()) return false;
    await new Promise((resolve) => setTimeout(resolve, 250));
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
    return Boolean(readAccessTokenFromSupabaseStorage());
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error && isRateLimitError(error.message)) {
    markSupabaseAuthRateLimited();
    return hasSupabaseAccessToken();
  }

  if (session?.access_token) {
    markSupabaseAuthVerified();
    return true;
  }

  return false;
}

export type SessionReadyOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  waitPerAttemptMs?: number;
};

/**
 * Waits for a usable Supabase JWT with exponential backoff between attempts.
 * Use before RPC/REST calls right after sign-in or page load.
 */
export async function waitForSupabaseSessionWithBackoff(
  options: SessionReadyOptions = {},
): Promise<boolean> {
  const maxAttempts = options.maxAttempts ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 250;
  const waitPerAttemptMs = options.waitPerAttemptMs ?? 6000;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (isSupabaseAuthRateLimited()) {
      return Boolean(readAccessTokenFromSupabaseStorage());
    }

    const ready =
      (await ensureSupabaseAuthSession()) || (await waitForSupabaseSession(waitPerAttemptMs));
    if (ready) return true;
    if (isSupabaseAuthRateLimited()) {
      return Boolean(readAccessTokenFromSupabaseStorage());
    }
    if (!hasSupabaseAuthStorage() && !getAuthSession()) return false;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(Math.round(delay * 1.6), 3000);
    }
  }

  return hasSupabaseAccessToken();
}
