import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { fetchProfilesForAdmin, type RemoteProfileRow } from "./supabase/profiles-remote";

export function useAdminProfiles(): {
  profiles: RemoteProfileRow[];
  loading: boolean;
} {
  const [profiles, setProfiles] = useState<RemoteProfileRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await fetchProfilesForAdmin();
      if (!cancelled) {
        setProfiles(result.rows);
        setLoading(false);
      }
    })();

    const interval = window.setInterval(() => {
      void fetchProfilesForAdmin().then((result) => {
        if (!cancelled) setProfiles(result.rows);
      });
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return { profiles, loading };
}
