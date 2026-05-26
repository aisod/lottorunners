import { getDataSyncMode, isSupabaseConfigured } from "./supabase/config";
import { subscribeRemoteJobs } from "./supabase/jobs-remote";
import { waitForSupabaseSession } from "./auth/ensure-session";
import { refreshAuthSessionFromProfile } from "./auth-users";
import { restoreSupabaseSession } from "./supabase/profiles-remote";
import { hydrateJobsFromRemote } from "./jobs-service";
import { hydratePlatformPricing } from "./platform-pricing";
import { notifyRunnerAccountChanged } from "./runner-account";

let initialized = false;
let unsubscribeRemote: (() => void) | null = null;
let hydrateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleHydrateFromRemote(): void {
  if (hydrateDebounceTimer) clearTimeout(hydrateDebounceTimer);
  hydrateDebounceTimer = setTimeout(() => {
    hydrateDebounceTimer = null;
    void hydrateJobsFromRemote();
  }, 400);
}

/** Pull shared jobs + Supabase session on app load; subscribe to realtime job updates. */
export async function initPlatformSync(): Promise<void> {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  await hydratePlatformPricing();

  if (isSupabaseConfigured()) {
    await restoreSupabaseSession();
    await waitForSupabaseSession(5000);
    await refreshAuthSessionFromProfile(true);
    notifyRunnerAccountChanged();
    await hydrateJobsFromRemote();
    unsubscribeRemote = subscribeRemoteJobs(scheduleHydrateFromRemote);
    return;
  }

  // Local-only: same-browser tabs sync via BroadcastChannel in jobs-service.
  void getDataSyncMode();
}

export function teardownPlatformSync(): void {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  if (hydrateDebounceTimer) clearTimeout(hydrateDebounceTimer);
  hydrateDebounceTimer = null;
  initialized = false;
}
