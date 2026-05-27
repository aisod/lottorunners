import { redirect } from "@tanstack/react-router";
import type { AppRole } from "@/lib/store";
import { getAuthSession } from "@/lib/auth-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { canRunClientAuthGuard } from "@/lib/auth/client-only-guard";
import {
  isSupabaseAuthRateLimited,
  waitForSupabaseSession,
} from "@/lib/auth/ensure-session";

/**
 * When Supabase is configured, redirect to sign-in if cloud JWT is missing but lr-auth remains.
 */
export async function guardCloudSessionForRole(role: AppRole): Promise<void> {
  if (!canRunClientAuthGuard()) return;
  if (!isSupabaseConfigured()) return;
  if (!getAuthSession()) return;

  if (await waitForSupabaseSession(3500)) return;

  if (isSupabaseAuthRateLimited()) return;

  throw redirect({
    to: "/customer/signin",
    search: { reason: "session_expired", role },
  });
}
