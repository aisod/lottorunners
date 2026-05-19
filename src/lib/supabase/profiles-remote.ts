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

function profileRowFromAuthMetadata(
  userId: string,
  email: string,
  metadata: Record<string, unknown> | undefined,
): RemoteProfileRow {
  const input = profileFromAuthMetadata(email, metadata);
  return {
    id: userId,
    email: input.email,
    display_name: input.displayName ?? null,
    phone: input.phone ?? null,
    roles: input.roles,
    primary_role: input.primaryRole ?? null,
    runner_status: input.runnerStatus ?? null,
    runner_stage: input.runnerStage ?? null,
  };
}

function profileFromAuthMetadata(email: string, metadata: Record<string, unknown> | undefined): RemoteProfileInput {
  const rolesRaw = metadata?.roles;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.filter((r): r is PublicRole => r === "customer" || r === "runner" || r === "business")
    : ["customer"];

  return {
    email: typeof metadata?.email === "string" ? metadata.email : email,
    displayName: typeof metadata?.display_name === "string" ? metadata.display_name : undefined,
    phone: typeof metadata?.phone === "string" ? metadata.phone : undefined,
    roles: roles.length > 0 ? roles : ["customer"],
    primaryRole:
      metadata?.primary_role === "customer" ||
      metadata?.primary_role === "runner" ||
      metadata?.primary_role === "business"
        ? metadata.primary_role
        : undefined,
    runnerStatus:
      typeof metadata?.runner_status === "string"
        ? (metadata.runner_status as RunnerOnboardingStatus)
        : undefined,
    runnerStage:
      typeof metadata?.runner_stage === "string" ? (metadata.runner_stage as RunnerStage) : undefined,
  };
}

export async function upsertRemoteProfile(
  userId: string,
  input: RemoteProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to the database." };

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

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type SignUpRemoteResult =
  | { ok: true; userId: string; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

export async function signUpRemote(
  email: string,
  password: string,
  profile: RemoteProfileInput,
): Promise<SignUpRemoteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: profileToAuthMetadata(profile) },
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign up did not return a user." };

  const userId = data.user.id;

  if (!data.session) {
    return {
      ok: true,
      userId,
      needsEmailConfirmation: true,
    };
  }

  const saved = await upsertRemoteProfile(userId, profile);
  if (saved.ok) {
    return { ok: true, userId };
  }

  const existing = await fetchProfileByUserId(userId);
  if (existing) {
    return { ok: true, userId };
  }

  return {
    ok: false,
    error: `Account created but profile could not be saved. ${saved.error} Run the latest Supabase migration (profile_on_auth_signup) in Lovable Cloud.`,
  };
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

  let row = await fetchProfileByUserId(data.user.id);

  if (!row) {
    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const repair = await upsertRemoteProfile(data.user.id, profileFromAuthMetadata(email, metadata));
    if (repair.ok) {
      row = await fetchProfileByUserId(data.user.id);
    }
  }

  if (!row) {
    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    row = profileRowFromAuthMetadata(data.user.id, email, metadata);
  }

  return { ok: true, userId: data.user.id, profile: rowToStoredShape(row) };
}

export async function establishSessionFromTokens(
  accessToken: string,
  refreshToken: string,
  email: string,
): Promise<
  { ok: true; userId: string; profile: ReturnType<typeof rowToStoredShape> } | { ok: false; error: string }
> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) return { ok: false, error: sessionError.message };
  const user = sessionData.user;
  if (!user) return { ok: false, error: "Sign in did not return a user." };

  let row = await fetchProfileByUserId(user.id);
  if (!row) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const repair = await upsertRemoteProfile(user.id, profileFromAuthMetadata(email, metadata));
    if (repair.ok) {
      row = await fetchProfileByUserId(user.id);
    }
  }

  if (!row) {
    row = profileRowFromAuthMetadata(user.id, email, (user.user_metadata ?? {}) as Record<string, unknown>);
  }

  return { ok: true, userId: user.id, profile: rowToStoredShape(row) };
}

export async function requestPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/customer/signin`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
