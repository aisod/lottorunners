/**
 * Session enforcement for runner console routes lives in:
 * - `src/routes/runner.tsx` beforeLoad (redirect with `reason=session_expired`)
 * - `src/routes/customer.signin.tsx` beforeLoad (clears lr-auth when reason is session_expired)
 *
 * A client-side gate was removed — it raced with router redirects and caused sign-out loops.
 */
export function RunnerSessionGate() {
  return null;
}
