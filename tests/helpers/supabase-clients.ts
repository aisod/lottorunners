import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseTestConfig } from "./env";

export function createAnonTestClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseTestConfig();
  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Setup/teardown only — never ship to the browser. */
export function createServiceRoleClient(): SupabaseClient {
  const { url, serviceRole } = getSupabaseTestConfig();
  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_TEST_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
