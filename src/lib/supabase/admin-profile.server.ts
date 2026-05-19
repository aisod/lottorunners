import type { RemoteProfileInput } from "./profiles-remote";

/** Server-only: write profile with service role (bypasses RLS). */
export async function upsertProfileWithServiceRole(
  userId: string,
  input: RemoteProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: input.email,
      display_name: input.displayName ?? null,
      phone: input.phone ?? null,
      roles: input.roles,
      primary_role: input.primaryRole ?? null,
      runner_status: input.runnerStatus ?? null,
      runner_stage: input.runnerStage ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Service role upsert failed.";
    return { ok: false, error: message };
  }
}
