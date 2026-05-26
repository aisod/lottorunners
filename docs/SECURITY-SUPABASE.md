# Supabase security analysis

Incremental fixes applied in migrations; this document explains risks and mitigations.

## Summary

| Area | Risk level (before fixes) | Mitigation |
|------|---------------------------|------------|
| `marketplace_jobs` | **Critical** — open read/update | `20260521130000` RLS + `accept_marketplace_job` RPC |
| `app_config` | **High** — all keys readable | `20260521140000` — pricing public; rest admin-only |
| `profiles` | **Medium** — global read | `20260521130000` — own row + admin |
| `runner_locations` | **Low write** / **open read** | Write scoped to `auth_runner_id()`; read all authenticated (tracking) |
| Storage `uploads` | **Low** | Path must start with `auth.uid()` |
| Admin actions | **Low** if RPCs used | `caller_is_admin()` inside security definer functions |

## Anonymous access

- All listed tables have RLS **enabled**.
- No policies for `anon` on `marketplace_jobs`, `profiles`, `runner_locations` → **anonymous cannot read/write** (only sign-in users).
- Storage `uploads_read` is **public** (`using (bucket_id = 'uploads')`) — anyone with URL can read uploaded files. Acceptable for public proof photos; do not store secrets in `uploads`.

## marketplace_jobs

### Risks (historical)

1. **Privilege escalation** — any user could `UPDATE` any job (reassign, cancel, complete).
2. **Data leak** — `SELECT` returned entire table to every signed-in user.
3. **Race on accept** — two runners could pass client checks; mitigated by RPC + conditional `UPDATE`.

### Current model

- **Read:** open pending jobs (marketplace feed), own customer/business/runner jobs, admin all.
- **Insert:** customer or business owner only (payload email must match JWT email).
- **Update:** owners + assigned runner; accept via **`accept_marketplace_job`** RPC (approved runner only).
- **App:** `acceptJobRemote` calls RPC; `upsertRemoteJob` checks errors.

### Residual risks

- Stale client `upsert` could overwrite if RLS allows update on owned rows — merge uses `serverUpdatedAt` in app.
- Runners see all **pending** jobs (by design for marketplace).

## profiles

### Risks

- **Global read** exposed emails/phones to any authenticated user.

### Fix

- `profiles_read`: `auth.uid() = id OR caller_is_admin()`.

### Approvals

- `admin_set_runner_status` — security definer, checks `caller_is_admin()`.
- Non-admins cannot set `runner_status` on other users via direct `UPDATE` (RLS: `auth.uid() = id` only).

### Residual

- Users can still update **own** `roles` in `profiles` if app sends it — app should not expose self-promote to admin (verify `profiles-remote` patches).

## runner_locations

### Risks

1. **Write as another runner** — mitigated: `lower(runner_id) = auth_runner_id()`.
2. **Read all locations** — any signed-in user (customer tracking). Intentional; do not store PII in coordinates.

### App

- `upsertRunnerLocationRemote` requires `ensureSupabaseAuthSession()`.
- Publisher bails if `getVerifiedRunnerId()` is null.

### Token/session misuse

- If JWT email ≠ `lr-auth` runner email, RLS write fails (correct). App should keep emails aligned via login.

## app_config

### Risks

1. **`admin_emails` visible** to all authenticated users → targeted phishing / admin discovery.
2. **No write policy** — writes only via `admin_upsert_app_config` (security definer) ✓

### Fix (`20260521140000`)

- Read: `marketplace_pricing` OR `caller_is_admin()`.

### Admin actions

- `admin_upsert_app_config` — requires `caller_is_admin()`.
- Bootstrap: `ensure_bootstrap_admin()` promotes emails in `admin_emails` (protect that key).

## Auth / session (app layer)

| Risk | Mitigation |
|------|------------|
| `lr-auth` without JWT | `guardCloudSessionForRole` on customer/business/admin/runner console |
| Guest bypass | `setAuthSession` blocked unless `VITE_ALLOW_LOCAL_DEV` |
| Profile refresh clobbering role | Preserve `activeRole` when still in `roles` |
| `getVerifiedRunnerId` cache | 30s cache; invalidate on auth events |

## Safe fixes applied (incremental)

1. `20260521130000_marketplace_jobs_rls_accept_rpc.sql`
2. `20260521140000_app_config_read_restrict.sql`
3. App: cloud session guards, RPC accept, merge by `updated_at`, rollback local jobs on failed sync

## Recommended next steps (optional)

- E2E smoke with Playwright on sign-in + one booking (no architecture change).
- Rate-limit `accept_marketplace_job` at edge if abuse appears.
- Narrow `runner_locations_read` to job participants only (larger query change).
