import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type ServerSignInResult =
  | {
      ok: true;
      userId: string;
      accessToken: string;
      refreshToken: string;
    }
  | { ok: false; error: string };

function getAnonConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

/** Same as client signInWithPassword; used when browser session storage interferes. */
export const signInOnServer = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<ServerSignInResult> => {
    const config = getAnonConfig();
    if (!config) {
      return { ok: false, error: "Lovable Cloud is not configured on the server." };
    }

    const email = data.email.trim().toLowerCase();
    const supabase = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) return { ok: false, error: error.message };
    if (!authData.session || !authData.user) {
      return { ok: false, error: "Sign in did not return a session." };
    }

    return {
      ok: true,
      userId: authData.user.id,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  });
