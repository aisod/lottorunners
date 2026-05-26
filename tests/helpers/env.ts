/** Integration tests: set in CI or `.env.test` (never commit service role). */
export function getSupabaseTestConfig() {
  const url = process.env.SUPABASE_TEST_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_TEST_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, anonKey, serviceRole };
}

export function hasSupabaseIntegrationEnv(): boolean {
  const { url, anonKey } = getSupabaseTestConfig();
  return Boolean(url && anonKey);
}

export function hasSupabaseServiceRole(): boolean {
  const { serviceRole } = getSupabaseTestConfig();
  return Boolean(serviceRole);
}
