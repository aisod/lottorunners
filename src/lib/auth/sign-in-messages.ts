import type { SignInDiagnosis } from "./diagnose-sign-in.server";

function isInvalidCredentialsMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("email or password is incorrect")
  );
}

export function messageForSignInDiagnosis(
  diagnosis: SignInDiagnosis,
  rawError: string,
): { error: string; action?: "resend_confirmation" | "sign_up" } {
  if (!diagnosis.ok) {
    if (isInvalidCredentialsMessage(rawError)) {
      return {
        error:
          "Supabase rejected this email/password. Common causes: email not confirmed yet, or you are only logged in on Lovable from an old session (not password). Try Resend confirmation or Forgot password.",
        action: "resend_confirmation",
      };
    }
    return { error: rawError };
  }

  switch (diagnosis.reason) {
    case "not_found":
      return {
        error:
          "No Lovable Cloud account exists for this email. Sign up on this site, or use the exact email you registered on preview--lottorunners.lovable.app.",
        action: "sign_up",
      };
    case "unconfirmed":
      return {
        error:
          "Your email is not confirmed yet. Open the confirmation link Supabase sent you, then sign in again. You can resend the email below.",
        action: "resend_confirmation",
      };
    case "oauth_only":
      return {
        error: `This account uses ${diagnosis.providers.join(", ")} sign-in, not a password. Use the same method you used on preview--lottorunners.lovable.app.`,
      };
    case "invalid_password":
      return {
        error:
          "Password does not match this account. Use Forgot password, or reset it in Lovable Cloud → Authentication → Users.",
      };
    default:
      return { error: rawError };
  }
}
