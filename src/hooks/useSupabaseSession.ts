import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { invalidateVerifiedRunnerIdCache } from "@/lib/auth/get-verified-runner-id";
import {
  markSupabaseAuthVerified,
  resetSupabaseAuthCache,
} from "@/lib/auth/ensure-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Single source of truth for Supabase JWT state (sign-in, sign-out, refresh).
 * Prefer this over reading lr-auth-session-v1 for API authorization.
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.access_token) {
        markSupabaseAuthVerified();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      invalidateVerifiedRunnerIdCache();
      if (nextSession?.access_token) {
        markSupabaseAuthVerified();
      } else if (event === "SIGNED_OUT") {
        resetSupabaseAuthCache();
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, isConfigured: isSupabaseConfigured() };
}
