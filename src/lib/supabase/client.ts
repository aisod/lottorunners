import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { markSupabaseAuthRateLimited } from "@/lib/auth/ensure-session";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  const url = getSupabaseUrl()!;
  const anonKey = getSupabaseAnonKey()!;
  client = createClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const target = typeof input === "string" ? input : input.url;
        if (target.includes("/auth/v1/token") && response.status === 429) {
          markSupabaseAuthRateLimited();
        }
        return response;
      },
    },
  });
  return client;
}
