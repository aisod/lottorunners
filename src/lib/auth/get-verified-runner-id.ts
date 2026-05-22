import { getAuthSession } from "@/lib/auth-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeRunnerId } from "@/lib/supabase/session";

/**
 * Runner identity for Supabase / RLS — from live JWT email, not lr-auth-session-v1.
 */
export async function getVerifiedRunnerId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    const session = getAuthSession();
    if (!session || session.activeRole !== "runner") return null;
    return normalizeRunnerId(session.email);
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) return null;

  return normalizeRunnerId(email);
}
