import { useEffect, useState } from "react";
import { readJobs, subscribeToJobs } from "./jobs-service";
import type { MarketplaceJob } from "./jobs-types";

/** Live marketplace jobs for admin dashboards (local store + realtime sync). */
export function useAllMarketplaceJobs(): MarketplaceJob[] {
  const [jobs, setJobs] = useState<MarketplaceJob[]>(() => readJobs());

  useEffect(() => {
    setJobs(readJobs());
    return subscribeToJobs(() => {
      setJobs(readJobs());
    });
  }, []);

  return jobs;
}
