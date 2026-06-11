import { getAuthSession } from "@/lib/auth-session";
import { waitForSupabaseSessionWithBackoff } from "@/lib/auth/ensure-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeRunnerId } from "@/lib/supabase/session";

const RUNNER_ID_CACHE_MS = 30_000;

let cached: { id: string; at: number } | null = null;

export function invalidateVerifiedRunnerIdCache(): void {
  cached = null;
}

/**
 * Runner identity for Supabase / RLS — from live JWT email, not lr-auth-session-v1.
 */
export async function getVerifiedRunnerId(): Promise<string | null> {
  const now = Date.now();
  if (cached && now - cached.at < RUNNER_ID_CACHE_MS) {
    return cached.id;
  }

  let id: string | null = null;

  if (!isSupabaseConfigured()) {
    const session = getAuthSession();
    if (session?.activeRole === "runner") {
      id = normalizeRunnerId(session.email);
    }
  } else {
    await waitForSupabaseSessionWithBackoff({ maxAttempts: 4, waitPerAttemptMs: 3000 });

    const supabase = getSupabaseClient();
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email) {
        id = normalizeRunnerId(email);
      }
    }

    if (!id) {
      const appSession = getAuthSession();
      if (appSession?.activeRole === "runner") {
        id = normalizeRunnerId(appSession.email);
      }
    }
  }

  if (id) {
    cached = { id, at: now };
  }
  return id;
}
