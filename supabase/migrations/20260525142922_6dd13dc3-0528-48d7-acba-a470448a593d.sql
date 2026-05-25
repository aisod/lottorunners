-- 1. marketplace_jobs UPDATE: scope to participants/admin
drop policy if exists "jobs_update" on public.marketplace_jobs;

create or replace function public.caller_can_modify_job(p_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.caller_is_admin()
    or lower(coalesce(p_payload->>'customerId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'customerEmail', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'runnerId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'runnerEmail', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'businessId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'businessEmail', '')) = public.auth_runner_id()
    -- allow runners to claim an unassigned (pending) job
    or (coalesce(p_payload->>'status','') = 'pending'
        and coalesce(p_payload->>'runnerId','') = '');
$$;

revoke all on function public.caller_can_modify_job(jsonb) from public;
grant execute on function public.caller_can_modify_job(jsonb) to authenticated;

create policy "jobs_update"
  on public.marketplace_jobs
  for update
  to authenticated
  using (public.caller_can_modify_job(payload))
  with check (public.caller_can_modify_job(payload));

-- 2. runner_locations SELECT: scope to self / assigned customers / admin
drop policy if exists "runner_locations_read" on public.runner_locations;

create policy "runner_locations_read"
  on public.runner_locations
  for select
  to authenticated
  using (
    lower(runner_id) = public.auth_runner_id()
    or public.caller_is_admin()
    or exists (
      select 1 from public.marketplace_jobs j
      where lower(coalesce(j.payload->>'runnerId','')) = lower(runner_locations.runner_id)
        and lower(coalesce(j.payload->>'customerId','')) = public.auth_runner_id()
        and coalesce(j.payload->>'status','') in ('accepted','en_route','arrived','in_progress')
    )
  );

-- 3. app_config SELECT: admin only (SECURITY DEFINER funcs bypass RLS so bootstrap still works)
drop policy if exists "app_config_read" on public.app_config;

create policy "app_config_read"
  on public.app_config
  for select
  to authenticated
  using (public.caller_is_admin());