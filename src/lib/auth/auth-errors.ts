/** Map Supabase Auth errors to clearer copy for multi-origin preview (localhost vs lovable.app). */
export function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Sign-in failed. If you can use the app on Lovable without signing in again, you may only have a saved session there—confirm your email or reset your password below.";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirm your email from the signup message, then sign in again.";
  }

  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }

  return message;
}
