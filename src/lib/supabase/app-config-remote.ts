import { getSupabaseClient } from "./client";
import { isSupabaseConfigured } from "./config";

export async function fetchAppConfigValue(key: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  return typeof data.value === "string" ? data.value : null;
}

export async function upsertAppConfigValue(
  key: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not connect to Supabase." };

  const { error } = await supabase.rpc("admin_upsert_app_config", {
    p_key: key,
    p_value: value,
  });

  if (error) {
    const msg = error.message ?? "Could not save platform setting.";
    if (msg.includes("admin_upsert_app_config") || error.code === "PGRST202") {
      return {
        ok: false,
        error:
          "Admin config RPC missing. Run migration 20260521120000_admin_app_config_upsert.sql in Supabase.",
      };
    }
    return { ok: false, error: msg };
  }

  return { ok: true };
}
