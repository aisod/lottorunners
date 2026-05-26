import { redirect } from "@tanstack/react-router";
import type { AppRole } from "@/lib/store";
import { getAuthSession } from "@/lib/auth-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ensureSupabaseAuthSession,
  hasSupabaseAuthStorage,
  isCloudAuthAbsent,
  isSupabaseAuthRateLimited,
  waitForSupabaseSession,
} from "@/lib/auth/ensure-session";

/**
 * When Supabase is configured, redirect to sign-in if cloud JWT is gone but lr-auth remains.
 * Defers while refresh tokens exist or auth is rate-limited (same as runner console).
 */
export async function guardCloudSessionForRole(role: AppRole): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (!getAuthSession()) return;

  if (await waitForSupabaseSession(3500)) return;

  if (isSupabaseAuthRateLimited() || hasSupabaseAuthStorage()) return;

  if (await isCloudAuthAbsent()) {
    throw redirect({
      to: "/customer/signin",
      search: { reason: "session_expired", role },
    });
  }
}
