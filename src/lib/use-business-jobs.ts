import { useEffect, useState } from "react";
import { getCurrentBusinessId, listJobsForBusiness, subscribeToJobs, type MarketplaceJob } from "./jobs-service";

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
