import { clearAuthSession } from "@/lib/auth-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Ensures a valid Supabase JWT exists before protected API calls.
 * Tries silent refresh; clears lr-auth-session-v1 if fully expired.
 */
export async function ensureSupabaseAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return true;

  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (!error && refreshed?.access_token) return true;

  clearAuthSession();
  return false;
}
