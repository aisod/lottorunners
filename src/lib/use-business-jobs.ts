import { useEffect, useState } from "react";
import {
  getCurrentBusinessId,
  hydrateJobsFromRemote,
  listJobsForBusiness,
  subscribeToJobs,
} from "./jobs-service";
import { isSupabaseConfigured } from "./supabase/config";
import type { MarketplaceJob } from "./jobs-types";

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
    if (isSupabaseConfigured()) {
      void hydrateJobsFromRemote().then(() => refresh());
    }

    return subscribeToJobs(refresh);
  }, [businessId]);

  return jobs;
}
