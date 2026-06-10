import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getServerAppOrigin(): string {
  const configured = process.env.VITE_APP_URL ?? process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return "https://pro.lottoerunners.com";
}

function getPasswordResetRedirectUrl(): string {
  return `${getServerAppOrigin()}/customer/reset-password`;
}

function mapResetPasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset attempts. Wait a few minutes and try again.";
  }
  if (lower.includes("redirect") || lower.includes("url")) {
    return "Password reset is misconfigured. Contact support@lottorunners.na.";
  }
  if (lower.includes("user not found") || lower.includes("not found")) {
    return "No account found for this email. Sign up first or check the spelling.";
  }
  return message;
}

export const requestPasswordResetServer = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => {
    const email = normalizeEmail(data.email);
    if (!email || !email.includes("@")) {
      throw new Error("Enter a valid email address.");
    }
    return { email };
  })
  .handler(async ({ data }) => {
    console.info("[reset-pw fn] entry", { email: data.email });

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY;
    const redirectTo = getPasswordResetRedirectUrl();

    console.info("[reset-pw fn] env", {
      hasUrl: Boolean(supabaseUrl),
      hasAnon: Boolean(anonKey),
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      redirectTo,
    });

    if (!supabaseUrl || !anonKey) {
      console.error("[reset-pw fn] missing supabase env");
      return { ok: false as const, error: "Supabase is not configured on the server." };
    }

    // NOTE: removed admin.generateLink pre-check — it actually generates a recovery
    // link (side effect, consumes rate limit) and was returning early on any error,
    // blocking the real email send. resetPasswordForEmail already handles unknown
    // users silently by design (anti-enumeration).

    const anon = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
    });

    console.info("[reset-pw fn] calling resetPasswordForEmail", { redirectTo });
    const { data: resetData, error } = await anon.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });

    if (error) {
      console.error("[reset-pw fn] resetPasswordForEmail error", {
        message: error.message,
        status: (error as { status?: number }).status,
        name: error.name,
      });
      return { ok: false as const, error: mapResetPasswordError(error.message) };
    }

    console.info("[reset-pw fn] resetPasswordForEmail success", resetData);
    return { ok: true as const };
  });
