import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type SignInDiagnosis =
  | { ok: true; reason: "not_found" }
  | { ok: true; reason: "unconfirmed" }
  | { ok: true; reason: "oauth_only"; providers: string[] }
  | { ok: true; reason: "invalid_password" }
  | { ok: false; reason: "unavailable" };

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const diagnoseSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<SignInDiagnosis> => {
    const admin = getAdminClient();
    if (!admin) return { ok: false, reason: "unavailable" };

    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: true, reason: "not_found" };

    const { data: userData, error } = await admin.auth.admin.getUserByEmail(email);
    if (error || !userData?.user) {
      return { ok: true, reason: "not_found" };
    }

    const user = userData.user;
    if (!user.email_confirmed_at) {
      return { ok: true, reason: "unconfirmed" };
    }

    const providers = (user.identities ?? []).map((identity) => identity.provider);
    const hasEmailIdentity = providers.includes("email");

    if (providers.length > 0 && !hasEmailIdentity) {
      return { ok: true, reason: "oauth_only", providers };
    }

    return { ok: true, reason: "invalid_password" };
  });
