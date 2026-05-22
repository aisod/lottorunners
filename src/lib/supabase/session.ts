import { ensureSupabaseAuthSession as ensureSupabaseAuthSessionCore } from "@/lib/auth/ensure-session";
import { getSupabaseClient } from "./client";
import { isSupabaseConfigured } from "./config";

/** Lowercase email — matches `auth_runner_id()` and RLS on `runner_locations`. */
export function normalizeRunnerId(email: string): string {
  return email.trim().toLowerCase();
}

export async function hasSupabaseAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  return !error && Boolean(data.session?.access_token);
}

/** @returns ok + user-facing message for UI */
export async function ensureSupabaseAuthSession(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured()) return { ok: true };

  const ok = await ensureSupabaseAuthSessionCore();
  if (ok) return { ok: true };

  return {
    ok: false,
    message: "Session expired. Please sign in again.",
  };
}

export function isUnauthorizedSupabaseError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "401" ||
    msg.includes("jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("invalid claim")
  );
}
