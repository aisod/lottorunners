import { useEffect, useState } from "react";
import { refreshAuthSessionFromProfile } from "@/lib/auth-users";
import {
  getRunnerOnboardingStatus,
  subscribeRunnerAccount,
  type RunnerOnboardingStatus,
} from "@/lib/runner-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Live runner approval status (refreshes from Supabase profile when configured). */
export function useRunnerOnboardingStatus(): RunnerOnboardingStatus {
  const [status, setStatus] = useState<RunnerOnboardingStatus>(() => getRunnerOnboardingStatus());

  useEffect(() => {
    return subscribeRunnerAccount(() => {
      setStatus(getRunnerOnboardingStatus());
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void refreshAuthSessionFromProfile();
  }, []);

  return status;
}
