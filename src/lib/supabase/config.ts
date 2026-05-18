/** True when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (see .env.example). */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && typeof url === "string" && typeof key === "string");
}

export type DataSyncMode = "supabase" | "local-only";

export function getDataSyncMode(): DataSyncMode {
  return isSupabaseConfigured() ? "supabase" : "local-only";
}
