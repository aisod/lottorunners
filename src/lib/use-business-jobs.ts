import { useEffect, useState } from "react";
import { waitForSupabaseSession } from "./auth/ensure-session";
import {
  getCurrentBusinessId,
  hydrateJobsFromRemote,
  listJobsForBusiness,
  subscribeToJobs,
} from "./jobs-service";
import { isSupabaseConfigured } from "./supabase/config";
import type { MarketplaceJob } from "./jobs-types";

const BUSINESS_JOBS_POLL_MS = 15_000;

export function useBusinessJobs(): MarketplaceJob[] {
  const businessId = getCurrentBusinessId();
  const [jobs, setJobs] = useState<MarketplaceJob[]>(() =>
    businessId ? listJobsForBusiness(businessId) : [],
  );

  useEffect(() => {
    if (!businessId) {
      setJobs([]);
      return;
    }

    const refresh = () => setJobs(listJobsForBusiness(businessId));

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
    const interval = window.setInterval(() => void pullRemote(), BUSINESS_JOBS_POLL_MS);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [businessId]);

  return jobs;
}
