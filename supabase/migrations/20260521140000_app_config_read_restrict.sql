-- Restrict app_config reads: public pricing for all authenticated users; sensitive keys admin-only.

drop policy if exists "app_config_read" on public.app_config;

create policy "app_config_read"
  on public.app_config
  for select
  to authenticated
  using (
    key = 'marketplace_pricing'
    or public.caller_is_admin()
  );

-- No direct INSERT/UPDATE policies: writes go through admin_upsert_app_config (security definer).
