# Testing guide

## Where tests live

```
tests/
  setup.ts                 # Clears localStorage between unit tests
  helpers/
    env.ts                 # SUPABASE_TEST_* / skip integration if unset
    supabase-clients.ts    # Anon + service-role clients (integration only)
    auth-fixtures.ts       # Seed lr-auth-session + lr-users for unit tests
  unit/                    # Fast, no network (run on every PR)
    auth-session.test.ts   # Signup mirror, roles, persistence, guest guard
    role-permissions.test.ts
    jobs-merge.test.ts
    runner-job-feed.test.ts
    runner-approval.test.ts
    jobs-local-accept.test.ts
  integration/             # Real Supabase (skipped without env)
    auth-signup-login.test.ts
    supabase-rls.test.ts    # RLS, accept RPC, GPS, app_config
```

**Source modules under test** (colocated logic, not UI):

| Concern | Module |
|--------|--------|
| Session / roles | `src/lib/auth-session.ts` |
| Runner approval | `src/lib/runner-account.ts` |
| Job merge on hydrate | `src/lib/jobs-merge.ts` |
| Runner feed filter | `src/lib/jobs-runner-feed.ts` |
| Local accept path | `src/lib/jobs-service.ts` |
| Cloud accept | `accept_marketplace_job` RPC (integration) |

## Commands

```bash
npm run test          # unit only (default)
npm run test:all      # unit + integration (needs Supabase env)
npm run test:integration
```

## Integration env (production-safe)

Use a **dedicated Supabase project** or branch — never production user data.

```bash
export SUPABASE_TEST_URL="https://xxxx.supabase.co"
export SUPABASE_TEST_ANON_KEY="eyJ..."
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # CI/setup only — never in the app bundle
```

Copy from `.env.example` or Lovable Cloud secrets. Service role is only used in tests to approve test runners and delete fixture rows.

## Patterns

- **Do not mock** Supabase Auth in integration tests — real `signUp` / `signInWithPassword`.
- **Mock only** `isSupabaseConfigured` in `jobs-local-accept.test.ts` to force the local accept path without faking JWT.
- Unit tests use **happy-dom** + real `localStorage` for `lr-auth-session-v1` persistence.

## Protected routes

Router `beforeLoad` guards are not mounted in Vitest. We test the **same rules** via `auth-session`, `getRoleHomePath`, and path allowlists documented in `role-permissions.test.ts`. E2E (Playwright) can be added later without changing app architecture.
