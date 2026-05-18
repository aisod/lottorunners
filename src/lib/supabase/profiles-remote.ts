import type { PublicRole } from "../auth-session";
import type { RunnerOnboardingStatus } from "../runner-account";
import type { RunnerStage } from "../store";
import { getSupabaseClient } from "./client";
import { isSupabaseConfigured } from "./config";

export type RemoteProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  roles: string[];
  primary_role: string | null;
  runner_status: string | null;
  runner_stage: string | null;
  updated_at?: string | null;
};

export type RemoteProfileInput = {
  email: string;
  displayName?: string;
  phone?: string;
  roles: PublicRole[];
  primaryRole?: PublicRole;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

function rowToStoredShape(row: RemoteProfileRow) {
  return {
    email: row.email,
    displayName: row.display_name ?? undefined,
    phone: row.phone ?? undefined,
    roles: row.roles.filter((r): r is PublicRole => r === "customer" || r === "runner" || r === "business"),
    primaryRole: (row.primary_role as PublicRole | null) ?? undefined,
    runnerStatus: (row.runner_status as RunnerOnboardingStatus | null) ?? undefined,
    runnerStage: (row.runner_stage as RunnerStage | null) ?? undefined,
  };
}

export async function fetchProfileByEmail(email: string): Promise<RemoteProfileRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  if (error || !data) return null;
  return data as RemoteProfileRow;
}

export async function fetchProfilesForAdmin(): Promise<RemoteProfileRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as RemoteProfileRow[];
}

export async function updateRemoteRunnerStatus(
  userId: string,
  runnerStatus: RunnerOnboardingStatus,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("profiles")
    .update({
      runner_status: runnerStatus,
      runner_stage: runnerStatus === "approved" ? "dashboard" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return !error;
}

export async function fetchProfileByUserId(userId: string): Promise<RemoteProfileRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data as RemoteProfileRow;
}

export async function upsertRemoteProfile(userId: string, input: RemoteProfileInput): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from("profiles").upsert({
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

  return !error;
}

export async function signUpRemote(
  email: string,
  password: string,
  profile: RemoteProfileInput,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign up did not return a user." };

  const saved = await upsertRemoteProfile(data.user.id, profile);
  if (!saved) return { ok: false, error: "Account created but profile could not be saved." };

  return { ok: true, userId: data.user.id };
}

export async function signInRemote(
  email: string,
  password: string,
): Promise<
  { ok: true; userId: string; profile: ReturnType<typeof rowToStoredShape> } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign in failed." };

  const row = await fetchProfileByUserId(data.user.id);
  if (!row) return { ok: false, error: "Profile not found for this account." };

  return { ok: true, userId: data.user.id, profile: rowToStoredShape(row) };
}

export async function restoreSupabaseSession(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function mergeRemoteDocuments(
  userId: string,
  patch: Record<string, string>,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data: row } = await supabase.from("profiles").select("documents").eq("id", userId).maybeSingle();
  const current =
    row?.documents && typeof row.documents === "object" && !Array.isArray(row.documents)
      ? (row.documents as Record<string, string>)
      : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      documents: { ...current, ...patch },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return !error;
}

export { rowToStoredShape };
