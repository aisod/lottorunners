import { useCallback, useEffect, useState } from "react";
import { refreshAuthSessionFromProfile } from "@/lib/auth-users";
import {
  getCurrentRunnerId,
  getJob,
  hydrateJobsFromRemote,
  listAvailableJobsForRunner,
  subscribeToJobs,
} from "./jobs-service";
import type { MarketplaceJob } from "./jobs-types";
import { canRunnerAcceptJobs, subscribeRunnerAccount } from "./runner-account";
import { isSupabaseConfigured } from "./supabase/config";

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

function readAvailableJobs(): MarketplaceJob[] {
  if (!canRunnerAcceptJobs()) return [];
  return listAvailableJobsForRunner(getCurrentRunnerId());
}

/** Pending jobs + remote sync for approved runners. */
export function useRunnerJobFeed(): { jobs: MarketplaceJob[]; syncError: string | null } {
  const [jobs, setJobs] = useState<MarketplaceJob[]>(() => readAvailableJobs());
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setJobs(readAvailableJobs());
  }, []);

  useEffect(() => {
    const pullRemote = async () => {
      if (!isSupabaseConfigured()) {
        refresh();
        return;
      }
      const result = await hydrateJobsFromRemote();
      if (!result.ok) {
        setSyncError(result.error);
        refresh();
        return;
      }
      setSyncError(null);
      refresh();
    };

    void refreshAuthSessionFromProfile().then(() => pullRemote());

    const unsubJobs = subscribeToJobs(refresh);
    const unsubAccount = subscribeRunnerAccount(() => {
      void refreshAuthSessionFromProfile().then(() => pullRemote());
    });

    const onFocus = () => {
      void refreshAuthSessionFromProfile().then(() => pullRemote());
    };
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => {
      void pullRemote();
    }, 30_000);

    return () => {
      unsubJobs();
      unsubAccount();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { jobs, syncError };
}
