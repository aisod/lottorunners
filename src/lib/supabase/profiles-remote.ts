import type { AccountRole, PublicRole } from "../auth-session";
import {
  markSupabaseAuthRateLimited,
  markSupabaseAuthVerified,
  waitForSupabaseSession,
} from "../auth/ensure-session";
import { normalizeRideCategories, type RideCategoryId } from "../ride-categories";
import type { RunnerOnboardingStatus } from "../runner-account";
import { useRunnerSettings } from "../runner-settings";
import type { RunnerStage } from "../store";
import { getSupabaseClient } from "./client";
import { getAdminBootstrapEmails, getAppPublicOrigin, isSupabaseConfigured } from "./config";

export type RemoteProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  roles: string[];
  primary_role: string | null;
  runner_status: string | null;
  runner_stage: string | null;
  ride_categories?: string[] | null;
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

function formatAdminModerationError(message: string, code?: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("read-only transaction")) {
    return "Supabase blocked a write during read (RLS). Run migration 20260521170000_fix_admin_rls_readonly.sql, then sign out and sign in again.";
  }
  if (code === "PGRST202" || lower.includes("admin_set_runner_status") || lower.includes("schema cache")) {
    return "Admin moderation is not set up in Supabase yet. Run migrations 20260519170000 and 20260519180000 in the SQL editor, then add your email to app_config (admin_emails).";
  }
  if (message === "Admin role required") {
    const hint =
      getAdminBootstrapEmails().length > 0
        ? ` Add the same email to Supabase: insert into app_config (key, value) values ('admin_emails', '${getAdminBootstrapEmails().join(",")}') on conflict (key) do update set value = excluded.value;`
        : " Run: insert into app_config (key, value) values ('admin_emails', 'your@email.com') on conflict (key) do update set value = excluded.value;";
    return `Your signed-in account is not an admin in Supabase.${hint} Then sign out and sign in again.`;
  }
  return message;
}

/** Promotes auth.uid() to admin when listed in app_config.admin_emails (see migration 20260519180000). */
export async function ensureBootstrapAdmin(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("ensure_bootstrap_admin");
  if (error) {
    const missing =
      error.code === "PGRST202" ||
      error.message.toLowerCase().includes("ensure_bootstrap_admin");
    if (missing) return false;
    // Read-only replica / throttled writes: still allow reads if already admin.
    if (error.message.toLowerCase().includes("read-only transaction")) {
      return false;
    }
    return false;
  }
  return data === true;
}

export type FetchProfilesForAdminResult =
  | { ok: true; rows: RemoteProfileRow[] }
  | { ok: false; rows: RemoteProfileRow[]; error: string };

export async function fetchProfilesForAdmin(): Promise<FetchProfilesForAdminResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, rows: [], error: "Supabase client unavailable." };
  }

  const ready = await waitForSupabaseSession(5000);
  if (!ready) {
    return {
      ok: false,
      rows: [],
      error: "Server session not ready. Refresh the page or sign in again.",
    };
  }

  await ensureBootstrapAdmin();

  const rpcResult = await supabase.rpc("fetch_profiles_for_admin");
  if (!rpcResult.error && rpcResult.data && Array.isArray(rpcResult.data)) {
    return { ok: true, rows: rpcResult.data as RemoteProfileRow[] };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    const msg = formatAdminModerationError(error.message, error.code);
    if (rpcResult.error) {
      const rpcMsg = formatAdminModerationError(rpcResult.error.message, rpcResult.error.code);
      return { ok: false, rows: [], error: rpcMsg || msg };
    }
    if (msg.includes("not an admin")) {
      return { ok: false, rows: [], error: msg };
    }
    return { ok: false, rows: [], error: msg || "Could not load profiles from the server." };
  }

  if (!data) return { ok: true, rows: [] };
  return { ok: true, rows: data as RemoteProfileRow[] };
}

export async function fetchApprovedRunnersForMatching(): Promise<RemoteProfileRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, roles, runner_status, ride_categories")
    .eq("runner_status", "approved")
    .contains("roles", ["runner"]);

  if (error || !data) return [];
  return data as RemoteProfileRow[];
}

export function hydrateRunnerRideCategoriesFromProfile(row: RemoteProfileRow | null): void {
  if (!row?.roles?.includes("runner")) return;
  useRunnerSettings.getState().setRideCategories(normalizeRideCategories(row.ride_categories ?? undefined));
}

export async function updateRemoteRideCategories(
  userId: string,
  categories: RideCategoryId[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const cleaned = normalizeRideCategories(categories);
  const { error } = await supabase
    .from("profiles")
    .update({
      ride_categories: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  useRunnerSettings.getState().setRideCategories(cleaned);
  return { ok: true };
}

export async function adminSetRunnerRideCategories(
  userId: string,
  categories: RideCategoryId[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  await ensureBootstrapAdmin();

  const cleaned = normalizeRideCategories(categories);
  const { error } = await supabase.rpc("admin_set_runner_ride_categories", {
    p_target_user_id: userId,
    p_ride_categories: cleaned,
  });

  if (error) {
    return { ok: false, error: formatAdminModerationError(error.message, error.code) };
  }
  return { ok: true };
}

export async function updateRemoteRunnerStatus(
  userId: string,
  runnerStatus: RunnerOnboardingStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user.id;

  if (sessionUserId && sessionUserId !== userId) {
    await ensureBootstrapAdmin();

    const attempt = async () =>
      supabase.rpc("admin_set_runner_status", {
        p_target_user_id: userId,
        p_runner_status: runnerStatus,
      });

    let { error } = await attempt();
    if (error?.message === "Admin role required") {
      await ensureBootstrapAdmin();
      ({ error } = await attempt());
    }

    if (error) {
      return { ok: false, error: formatAdminModerationError(error.message, error.code) };
    }
    return { ok: true };
  }

  const runnerStage =
    runnerStatus === "approved"
      ? "dashboard"
      : runnerStatus === "pending_verification" || runnerStatus === "rejected"
        ? "verification"
        : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      runner_status: runnerStatus,
      runner_stage: runnerStage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Could not update runner status in Supabase." };
  return { ok: true };
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
  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("429")) {
      markSupabaseAuthRateLimited();
      return { ok: false, error: "Too many sign-in attempts. Wait about a minute and try again." };
    }
    if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
      return { ok: false, error: "Incorrect email or password." };
    }
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: "Sign in failed." };
  if (!data.session?.access_token) {
    return {
      ok: false,
      error: "Sign-in succeeded but no session was issued. Confirm your email or try again in a moment.",
    };
  }

  markSupabaseAuthVerified();

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

function getPasswordResetRedirectUrl(): string {
  const origin = getAppPublicOrigin();
  if (origin) return `${origin}/customer/reset-password`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/customer/reset-password`;
  }
  return "/customer/reset-password";
}

function mapResetPasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset attempts. Wait a few minutes and try again.";
  }
  if (lower.includes("redirect") || lower.includes("url")) {
    return "Password reset link is misconfigured. Contact support@lottoerunners.com.";
  }
  return message;
}

export async function requestPasswordResetRemote(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) return { ok: false, error: mapResetPasswordError(error.message) };
  return { ok: true };
}

export async function updatePasswordRemote(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const ready = await waitForSupabaseSession(8000);
  if (!ready) {
    return {
      ok: false,
      error: "Reset link expired or invalid. Request a new password reset email from sign in.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutRemote(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchRemoteDocuments(userId: string): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase.from("profiles").select("documents").eq("id", userId).maybeSingle();
  if (error || !data?.documents) return {};

  const docs = data.documents;
  if (typeof docs !== "object" || docs === null || Array.isArray(docs)) return {};
  return docs as Record<string, string>;
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
