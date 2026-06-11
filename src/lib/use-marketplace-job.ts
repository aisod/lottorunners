import { useCallback, useEffect, useState } from "react";
import { refreshAuthSessionFromProfile } from "@/lib/auth-users";
import {
  isSupabaseAuthRateLimited,
  supabaseAuthRateLimitMessage,
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
const CUSTOMER_JOB_POLL_MAX_MS = 15_000;

export type CustomerMarketplaceJobState = {
  job: MarketplaceJob | null;
  syncError: string | null;
  retrySync: () => void;
};

/**
 * Customer active job: local store + poll Supabase while waiting for a runner (accept updates server only).
 */
export function useCustomerMarketplaceJob(jobId: string | null | undefined): CustomerMarketplaceJobState {
  const job = useMarketplaceJob(jobId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);

  const retrySync = useCallback(() => {
    setSyncError(null);
    setSyncNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!jobId || !isSupabaseConfigured()) return;

    let cancelled = false;
    let pollMs = CUSTOMER_JOB_POLL_MS;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = (ms: number) => {
      if (cancelled) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void pull();
      }, ms);
    };

    const pull = async () => {
      if (cancelled) return;

      if (isSupabaseAuthRateLimited()) {
        setSyncError(
          `${supabaseAuthRateLimitMessage()} Your trip status will update once sign-in recovers.`,
        );
        schedule(Math.max(pollMs, 15_000));
        return;
      }

      const ready = await waitForSupabaseSessionWithBackoff({
        maxAttempts: 4,
        waitPerAttemptMs: 4000,
      });
      if (cancelled) return;

      if (!ready) {
        setSyncError("Server session not ready. Retrying…");
        pollMs = Math.min(Math.round(pollMs * 1.5), CUSTOMER_JOB_POLL_MAX_MS);
        schedule(pollMs);
        return;
      }

      const result = await syncCustomerJobFromRemote(jobId);
      if (cancelled) return;

      if (!result.ok) {
        setSyncError(result.error);
        pollMs = Math.min(Math.round(pollMs * 1.5), CUSTOMER_JOB_POLL_MAX_MS);
        schedule(pollMs);
        return;
      }

      setSyncError(null);
      pollMs = CUSTOMER_JOB_POLL_MS;

      const current = getJob(jobId);
      if (current && current.status !== "pending") {
        return;
      }
      schedule(pollMs);
    };

    void pull();

    const onFocus = () => {
      pollMs = CUSTOMER_JOB_POLL_MS;
      void pull();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
    };
  }, [jobId, syncNonce]);

  return { job, syncError, retrySync };
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
