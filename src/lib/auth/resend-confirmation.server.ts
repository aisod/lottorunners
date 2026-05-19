import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type ResendConfirmationResult =
  | { ok: true }
  | { ok: false; error: string };

function getAnonClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const resendSignupConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<ResendConfirmationResult> => {
    const supabase = getAnonClient();
    if (!supabase) {
      return { ok: false, error: "Cloud email service is not configured on the server." };
    }

    const email = data.email.trim().toLowerCase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  });
