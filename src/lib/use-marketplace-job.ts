import { useEffect, useState } from "react";
import {
  getCurrentRunnerId,
  getJob,
  listAvailableJobsForRunner,
  subscribeToJobs,
  type MarketplaceJob,
} from "./jobs-service";
import { canRunnerAcceptJobs } from "./runner-account";

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

/** Pending marketplace jobs for approved runners (excludes locally declined). */
export function useRunnerAvailableJobs(): MarketplaceJob[] {
  const [jobs, setJobs] = useState<MarketplaceJob[]>(() =>
    canRunnerAcceptJobs() ? listAvailableJobsForRunner(getCurrentRunnerId()) : [],
  );

  useEffect(() => {
    return subscribeToJobs(() => {
      if (!canRunnerAcceptJobs()) {
        setJobs([]);
        return;
      }
      setJobs(listAvailableJobsForRunner(getCurrentRunnerId()));
    });
  }, []);

  return jobs;
}
