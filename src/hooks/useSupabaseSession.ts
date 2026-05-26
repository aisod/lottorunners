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
    let initialHydrated = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      initialHydrated = true;
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

      // Avoid INITIAL_SESSION(null) racing ahead of getSession() and wiping a valid session.
      if (!initialHydrated && event !== "SIGNED_OUT") {
        return;
      }

      if (nextSession?.access_token) {
        markSupabaseAuthVerified();
        setSession(nextSession);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        resetSupabaseAuthCache();
        setSession(null);
        setLoading(false);
        return;
      }

      // Ignore transient null sessions (e.g. refresh) until Supabase confirms sign-out.
      void supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session?.access_token) {
          markSupabaseAuthVerified();
        }
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // If auth events left session null but Supabase still has a JWT, resync once after hydration.
  useEffect(() => {
    if (!isSupabaseConfigured() || loading || session?.access_token) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session?.access_token) return;
      setSession(data.session);
      markSupabaseAuthVerified();
    });

    return () => {
      cancelled = true;
    };
  }, [loading, session?.access_token]);

  return { session, loading, isConfigured: isSupabaseConfigured() };
}
