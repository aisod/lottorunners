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
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const redirectTo = getPasswordResetRedirectUrl();

    if (!supabaseUrl || !anonKey) {
      return { ok: false as const, error: "Supabase is not configured on the server." };
    }

    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: verifyError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo },
      });
      if (verifyError) {
        return { ok: false as const, error: mapResetPasswordError(verifyError.message) };
      }
    }

    const anon = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
    });
    const { error } = await anon.auth.resetPasswordForEmail(data.email, { redirectTo });
    if (error) {
      return { ok: false as const, error: mapResetPasswordError(error.message) };
    }

    return { ok: true as const };
  });
