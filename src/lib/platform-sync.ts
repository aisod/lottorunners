import { getDataSyncMode, isSupabaseConfigured } from "./supabase/config";
import { subscribeRemoteJobs } from "./supabase/jobs-remote";
import { applyRemoteProfileToLocalSession } from "./auth-users";
import { fetchProfileByUserId, restoreSupabaseSession } from "./supabase/profiles-remote";
import { rowToStoredShape } from "./supabase/profiles-remote";
import { getSupabaseClient } from "./supabase/client";
import { hydrateJobsFromRemote } from "./jobs-service";

let initialized = false;
let unsubscribeRemote: (() => void) | null = null;

/** Pull shared jobs + Supabase session on app load; subscribe to realtime job updates. */
export async function initPlatformSync(): Promise<void> {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  if (isSupabaseConfigured()) {
    await restoreSupabaseSession();
    const supabase = getSupabaseClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (session?.user) {
      const row = await fetchProfileByUserId(session.user.id);
      if (row) {
        applyRemoteProfileToLocalSession(rowToStoredShape(row), session.user.id);
      }
    }
    await hydrateJobsFromRemote();
    unsubscribeRemote = subscribeRemoteJobs(() => {
      void hydrateJobsFromRemote();
    });
    return;
  }

  // Local-only: same-browser tabs sync via BroadcastChannel in jobs-service.
  void getDataSyncMode();
}

export function getCrossDeviceMessage(): string | null {
  if (isSupabaseConfigured()) return null;
  return "Accounts and jobs are stored on this device only. Add Supabase keys in .env (see .env.example) to sign in and share jobs across devices.";
}

export function teardownPlatformSync(): void {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  initialized = false;
}
