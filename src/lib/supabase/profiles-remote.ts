import type { AccountRole, PublicRole } from "../auth-session";
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
  roles: AccountRole[];
  primaryRole?: AccountRole;
  runnerStatus?: RunnerOnboardingStatus;
  runnerStage?: RunnerStage;
};

function parseAccountRole(value: string | null): AccountRole | undefined {
  if (value === "customer" || value === "runner" || value === "business" || value === "admin") {
    return value;
  }
  return undefined;
}

function rowToStoredShape(row: RemoteProfileRow) {
  const roles = row.roles
    .map((r) => parseAccountRole(r))
    .filter((r): r is AccountRole => Boolean(r));

  return {
    email: row.email,
    displayName: row.display_name ?? undefined,
    phone: row.phone ?? undefined,
    roles: roles.length > 0 ? roles : (["customer"] as AccountRole[]),
    primaryRole: parseAccountRole(row.primary_role) ?? undefined,
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

  const runnerStage =
    runnerStatus === "approved"
      ? "dashboard"
      : runnerStatus === "pending_verification" || runnerStatus === "rejected"
        ? "verification"
        : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      runner_status: runnerStatus,
      runner_stage: runnerStage,
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

function profileToAuthMetadata(profile: RemoteProfileInput): Record<string, string> {
  return {
    display_name: profile.displayName?.trim() ?? "",
    phone: profile.phone ?? "",
    roles: profile.roles.join(","),
    primary_role: profile.primaryRole ?? "customer",
    runner_status: profile.runnerStatus ?? "",
    runner_stage: profile.runnerStage ?? "",
  };
}

function parseRolesFromMetadata(raw: unknown): AccountRole[] {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = raw
      .split(",")
      .map((part) => part.trim())
      .filter((part): part is AccountRole =>
        part === "customer" || part === "runner" || part === "business" || part === "admin",
      );
    if (parsed.length > 0) return parsed;
  }
  return ["customer"];
}

export function profileInputFromAuthUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  fallbackEmail: string,
): RemoteProfileInput {
  const meta = user.user_metadata ?? {};
  return {
    email: (user.email ?? fallbackEmail).trim().toLowerCase(),
    displayName: typeof meta.display_name === "string" ? meta.display_name : undefined,
    phone: typeof meta.phone === "string" ? meta.phone : undefined,
    roles: parseRolesFromMetadata(meta.roles),
    primaryRole: parseAccountRole(typeof meta.primary_role === "string" ? meta.primary_role : null),
    runnerStatus:
      typeof meta.runner_status === "string" && meta.runner_status
        ? (meta.runner_status as RunnerOnboardingStatus)
        : undefined,
    runnerStage:
      typeof meta.runner_stage === "string" && meta.runner_stage
        ? (meta.runner_stage as RunnerStage)
        : undefined,
  };
}

async function ensureRemoteProfileViaRpc(
  input: RemoteProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { error } = await supabase.rpc("ensure_profile_for_user", {
    p_email: input.email,
    p_phone: input.phone ?? null,
    p_roles: input.roles,
    p_primary_role: input.primaryRole ?? "customer",
    p_runner_status: input.runnerStatus ?? null,
    p_runner_stage: input.runnerStage ?? null,
    p_display_name: input.displayName ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertRemoteProfile(
  userId: string,
  input: RemoteProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user.id === userId) {
    const viaRpc = await ensureRemoteProfileViaRpc(input);
    if (viaRpc.ok) return viaRpc;
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: input.email,
      display_name: input.displayName ?? null,
      phone: input.phone ?? null,
      roles: input.roles,
      primary_role: input.primaryRole ?? null,
      runner_status: input.runnerStatus ?? null,
      runner_stage: input.runnerStage ?? null,
      documents: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: profileToAuthMetadata(profile) },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign up did not return a user." };

  const userId = data.user.id;

  if (data.session) {
    const saved = await upsertRemoteProfile(userId, profile);
    let row = await fetchProfileByUserId(userId);
    if (!row && !saved.ok) {
      return {
        ok: false,
        error: `Account created but profile could not be saved. ${saved.error}`,
      };
    }
    if (!row) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      row = await fetchProfileByUserId(userId);
    }
    if (!row) {
      return {
        ok: false,
        error:
          "Account created but profile could not be saved. Run the ensure_profile migration in Supabase, then try signing in.",
      };
    }
  }

  // Email confirmation on: no session yet — DB trigger should create the profile after auth insert.
  return { ok: true, userId };
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
    const repair = await upsertRemoteProfile(data.user.id, profileInputFromAuthUser(data.user, email));
    if (repair.ok) {
      row = await fetchProfileByUserId(data.user.id);
    }
  }
  if (!row) {
    return {
      ok: false,
      error: "Profile not found for this account. Contact support if you recently signed up.",
    };
  }

  return { ok: true, userId: data.user.id, profile: rowToStoredShape(row) };
}

export async function restoreSupabaseSession(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function signOutRemote(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
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
