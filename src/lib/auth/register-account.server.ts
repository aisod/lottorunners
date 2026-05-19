import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { PublicRole } from "@/lib/auth-session";
import type { RunnerOnboardingStatus } from "@/lib/runner-account";
import type { RunnerStage } from "@/lib/store";
import { upsertProfileWithServiceRole } from "@/lib/supabase/admin-profile.server";
import type { RemoteProfileInput } from "@/lib/supabase/profiles-remote";

export type RegisterAccountPayload = {
  email: string;
  password: string;
  phone: string;
  roles: PublicRole[];
  primaryRole: PublicRole;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

export type RegisterAccountResult =
  | { ok: true; userId: string; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

function getServerSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

function profileToAuthMetadata(input: RemoteProfileInput): Record<string, unknown> {
  return {
    email: input.email,
    display_name: input.displayName ?? null,
    phone: input.phone ?? null,
    roles: input.roles,
    primary_role: input.primaryRole ?? null,
    runner_status: input.runnerStatus ?? null,
    runner_stage: input.runnerStage ?? null,
  };
}

export const registerAccountOnServer = createServerFn({ method: "POST" })
  .inputValidator((data: RegisterAccountPayload) => data)
  .handler(async ({ data }): Promise<RegisterAccountResult> => {
    const config = getServerSupabaseConfig();
    if (!config) {
      return { ok: false, error: "Lovable Cloud database is not configured on the server." };
    }

    const profile: RemoteProfileInput = {
      email: data.email,
      phone: data.phone,
      roles: data.roles,
      primaryRole: data.primaryRole,
      runnerStatus: data.runnerStatus,
      runnerStage: data.runnerStage,
    };

    const supabase = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: profileToAuthMetadata(profile) },
    });

    if (signUpError) {
      return { ok: false, error: signUpError.message };
    }

    if (!authData.user) {
      return { ok: false, error: "Sign up did not return a user." };
    }

    const userId = authData.user.id;
    const saved = await upsertProfileWithServiceRole(userId, profile);

    if (!saved.ok) {
      return {
        ok: false,
        error: `Account created but profile could not be saved. ${saved.error}`,
      };
    }

    return {
      ok: true,
      userId,
      needsEmailConfirmation: !authData.session,
    };
  });
