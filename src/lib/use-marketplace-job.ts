import { useEffect, useState } from "react";
import { getJob, subscribeToJobs } from "./jobs-service";
import type { MarketplaceJob } from "./jobs-types";

export function useMarketplaceJob(jobId: string | null | undefined): MarketplaceJob | null {
  const [job, setJob] = useState<MarketplaceJob | null>(() => (jobId ? getJob(jobId) : null));

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    setJob(getJob(jobId));
    return subscribeToJobs(() => {
      setJob(getJob(jobId));
    });
  }, [jobId]);

  return job;
}

export function usePendingJobs(): MarketplaceJob[] {
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);

  useEffect(() => {
    return subscribeToJobs((all) => {
      setJobs(all.filter((j) => j.status === "pending").sort((a, b) => b.createdAt - a.createdAt));
    });
  }, []);

  return jobs;
}
