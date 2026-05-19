import { getAuthSession, clearAuthSession, type AuthSession } from "@/lib/auth-session";
import { applyRemoteProfileToLocalSession } from "@/lib/auth-users";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchProfileByUserId,
  rowToStoredShape,
} from "@/lib/supabase/profiles-remote";

/** Sign out Supabase (if configured) and clear the app session. */
export async function signOutEverywhere(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  clearAuthSession();
}

/**
 * When Lovable Cloud is on, only treat the user as signed in if Supabase has a session
 * on this origin. Clears stale lr-auth-session from local-only or another environment.
 */
export async function reconcileCloudAuthSession(): Promise<AuthSession | null> {
  const local = getAuthSession();

  if (!isSupabaseConfigured()) {
    return local;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (local) clearAuthSession();
    return null;
  }

  const { data } = await supabase.auth.getSession();
  const remote = data.session;

  if (remote?.user) {
    const email = remote.user.email?.trim().toLowerCase() ?? "";
    if (!local || local.email !== email) {
      const row = await fetchProfileByUserId(remote.user.id);
      if (row) {
        applyRemoteProfileToLocalSession(rowToStoredShape(row), remote.user.id);
        return getAuthSession();
      }
    }
    return local;
  }

  if (local) {
    clearAuthSession();
  }

  return null;
}
