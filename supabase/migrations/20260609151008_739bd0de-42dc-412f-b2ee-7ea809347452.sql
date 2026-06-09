
-- Helper: is the caller an approved runner?
create or replace function public.caller_is_approved_runner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and runner_status = 'approved'
  );
$$;

revoke all on function public.caller_is_approved_runner() from public;
grant execute on function public.caller_is_approved_runner() to authenticated;

-- Restrict the "open pending" marketplace read to approved runners only.
drop policy if exists "jobs_read" on public.marketplace_jobs;
create policy "jobs_read" on public.marketplace_jobs
  for select
  to authenticated
  using (
    caller_is_admin()
    or (job_is_open_pending(payload) and public.caller_is_approved_runner())
    or job_owner_customer_email(payload) = auth_runner_id()
    or job_owner_business_email(payload) = auth_runner_id()
    or (job_runner_email(payload) <> '' and job_runner_email(payload) = auth_runner_id())
  );

-- Keep the SECURITY DEFINER feed function consistent.
create or replace function public.fetch_marketplace_jobs_feed()
returns table(id text, payload jsonb, updated_at timestamp with time zone)
language sql
stable
security definer
set search_path to 'public'
as $$
  select j.id, j.payload, j.updated_at
  from public.marketplace_jobs j
  where
    public.caller_is_admin()
    or (public.job_is_open_pending(j.payload) and public.caller_is_approved_runner())
    or public.job_owner_customer_email(j.payload) = public.auth_runner_id()
    or public.job_owner_business_email(j.payload) = public.auth_runner_id()
    or (
      public.job_runner_email(j.payload) <> ''
      and public.job_runner_email(j.payload) = public.auth_runner_id()
    )
  order by j.updated_at desc;
$$;
