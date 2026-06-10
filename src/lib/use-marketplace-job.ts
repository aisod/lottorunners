import { useCallback, useEffect, useState } from "react";
import { refreshAuthSessionFromProfile } from "@/lib/auth-users";
import {
  waitForSupabaseSession,
  waitForSupabaseSessionWithBackoff,
} from "@/lib/auth/ensure-session";
import {
  getCurrentRunnerId,
  getJob,
  hydrateJobsFromRemote,
  listAvailableJobsForRunner,
  subscribeToJobs,
  syncCustomerJobFromRemote,
} from "./jobs-service";
import type { MarketplaceJob } from "./jobs-types";
import { canRunnerAcceptJobs, subscribeRunnerAccount } from "./runner-account";
import { isSupabaseConfigured } from "./supabase/config";

export function useMarketplaceJob(jobId: string | null | undefined): MarketplaceJob | null {
  const [job, setJob] = useState<MarketplaceJob | null>(null);

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

const CUSTOMER_JOB_POLL_MS = 3_000;

/**
 * Customer active job: local store + poll Supabase while waiting for a runner (accept updates server only).
 */
export function useCustomerMarketplaceJob(jobId: string | null | undefined): MarketplaceJob | null {
  const job = useMarketplaceJob(jobId);

  useEffect(() => {
    if (!jobId || !isSupabaseConfigured()) return;

    let cancelled = false;

    const pull = async () => {
      if (cancelled) return;
      await waitForSupabaseSession(4000);
      if (cancelled) return;
      await syncCustomerJobFromRemote(jobId);
    };

    void pull();

    const interval = window.setInterval(() => {
      const current = getJob(jobId);
      if (current && current.status !== "pending") return;
      void pull();
    }, CUSTOMER_JOB_POLL_MS);

    const onFocus = () => void pull();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [jobId, job?.status]);

  return job;
}

function readAvailableJobs(): MarketplaceJob[] {
  if (!canRunnerAcceptJobs()) return [];
  return listAvailableJobsForRunner(getCurrentRunnerId());
}

/** Pending jobs + remote sync for approved runners. */
export function useRunnerJobFeed(): { jobs: MarketplaceJob[]; syncError: string | null } {
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);
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

    void (async () => {
      await waitForSupabaseSessionWithBackoff();
      await refreshAuthSessionFromProfile(true);
      await pullRemote();
    })();

    const unsubJobs = subscribeToJobs(refresh);
    const unsubAccount = subscribeRunnerAccount(() => {
      void pullRemote();
    });

    const onFocus = () => {
      void (async () => {
        await waitForSupabaseSession(3000);
        await pullRemote();
      })();
    };
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => {
      void (async () => {
        await waitForSupabaseSession(3000);
        await pullRemote();
      })();
    }, 45_000);

    return () => {
      unsubJobs();
      unsubAccount();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { jobs, syncError };
}
