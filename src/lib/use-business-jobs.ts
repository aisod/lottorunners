import { useEffect, useState } from "react";
import { getCurrentBusinessId, listJobsForBusiness, subscribeToJobs } from "./jobs-service";
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

    setJobs(listJobsForBusiness(businessId));
    return subscribeToJobs(() => {
      setJobs(listJobsForBusiness(businessId));
    });
  }, [businessId]);

  return jobs;
}
