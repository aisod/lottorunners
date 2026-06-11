import { useEffect, useState } from "react";
import { waitForSupabaseSession } from "./auth/ensure-session";
import { hydrateJobsFromRemote, readJobs, subscribeToJobs } from "./jobs-service";
import { isSupabaseConfigured } from "./supabase/config";
import type { MarketplaceJob } from "./jobs-types";

const ADMIN_JOBS_POLL_MS = 15_000;

/** Live marketplace jobs for admin dashboards (local store + remote sync). */
export function useAllMarketplaceJobs(): MarketplaceJob[] {
  const [jobs, setJobs] = useState<MarketplaceJob[]>(() => readJobs());

  useEffect(() => {
    const refresh = () => setJobs(readJobs());

    refresh();
    const unsub = subscribeToJobs(refresh);

    if (!isSupabaseConfigured()) return unsub;

    const pullRemote = async () => {
      await waitForSupabaseSession(4000);
      const result = await hydrateJobsFromRemote();
      if (result.ok) refresh();
    };

    void pullRemote();

    const onFocus = () => void pullRemote();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void pullRemote(), ADMIN_JOBS_POLL_MS);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, []);

  return jobs;
}
