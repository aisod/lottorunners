/**
 * Route guards read lr-auth and Supabase tokens from browser storage.
 * Running them during SSR makes every hard refresh look signed out.
 */
export function canRunClientAuthGuard(): boolean {
  return typeof window !== "undefined";
}
