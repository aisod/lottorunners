-- Tighten marketplace_jobs RLS and atomic accept via security definer RPC.

-- Reuse auth_runner_id() as normalized JWT/profile email (same as app session email).

create or replace function public.job_owner_customer_email(job_payload jsonb)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(job_payload ->> 'customerEmail', job_payload ->> 'customerId', '')));
$$;

create or replace function public.job_owner_business_email(job_payload jsonb)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(job_payload ->> 'businessEmail', job_payload ->> 'businessId', '')));
$$;

create or replace function public.job_runner_email(job_payload jsonb)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(job_payload ->> 'runnerEmail', job_payload ->> 'runnerId', '')));
$$;

create or replace function public.job_is_open_pending(job_payload jsonb)
returns boolean
language sql
immutable
as $$
  select (job_payload ->> 'status') = 'pending'
    and (job_payload ->> 'runnerId' is null or trim(job_payload ->> 'runnerId') = '');
$$;

drop policy if exists "jobs_read" on public.marketplace_jobs;
drop policy if exists "jobs_insert" on public.marketplace_jobs;
drop policy if exists "jobs_update" on public.marketplace_jobs;

create policy "jobs_read"
  on public.marketplace_jobs
  for select
  to authenticated
  using (
    public.caller_is_admin()
    or public.job_is_open_pending(payload)
    or public.job_owner_customer_email(payload) = public.auth_runner_id()
    or public.job_owner_business_email(payload) = public.auth_runner_id()
    or (
      public.job_runner_email(payload) <> ''
      and public.job_runner_email(payload) = public.auth_runner_id()
    )
  );

create policy "jobs_insert"
  on public.marketplace_jobs
  for insert
  to authenticated
  with check (
    public.caller_is_admin()
    or (
      public.job_owner_customer_email(payload) = public.auth_runner_id()
      and coalesce(payload ->> 'source', 'customer') <> 'business'
    )
    or (
      coalesce(payload ->> 'source', '') = 'business'
      and public.job_owner_business_email(payload) = public.auth_runner_id()
    )
  );

create policy "jobs_update"
  on public.marketplace_jobs
  for update
  to authenticated
  using (
    public.caller_is_admin()
    or public.job_owner_customer_email(payload) = public.auth_runner_id()
    or public.job_owner_business_email(payload) = public.auth_runner_id()
    or (
      public.job_runner_email(payload) <> ''
      and public.job_runner_email(payload) = public.auth_runner_id()
    )
  )
  with check (
    public.caller_is_admin()
    or public.job_owner_customer_email(payload) = public.auth_runner_id()
    or public.job_owner_business_email(payload) = public.auth_runner_id()
    or (
      public.job_runner_email(payload) <> ''
      and public.job_runner_email(payload) = public.auth_runner_id()
    )
  );

-- Atomic accept: only pending, unassigned jobs; runner must be approved.
create or replace function public.accept_marketplace_job(
  p_job_id text,
  p_runner_name text,
  p_runner_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_runner_id text;
  v_runner_status text;
  v_current jsonb;
  v_updated jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_runner_id := public.auth_runner_id();
  if v_runner_id is null or v_runner_id = '' then
    raise exception 'Could not resolve runner identity';
  end if;

  select runner_status into v_runner_status
  from public.profiles
  where id = auth.uid();

  if v_runner_status is distinct from 'approved' then
    raise exception 'Runner profile must be approved before accepting jobs';
  end if;

  select payload into v_current
  from public.marketplace_jobs
  where id = p_job_id
  for update;

  if v_current is null then
    raise exception 'Job not found';
  end if;

  if (v_current ->> 'status') is distinct from 'pending'
     or (v_current ->> 'runnerId') is not null and trim(v_current ->> 'runnerId') <> '' then
    raise exception 'Job is no longer available';
  end if;

  v_updated := v_current
    || jsonb_build_object(
      'runnerId', v_runner_id,
      'runnerEmail', v_runner_id,
      'runnerName', coalesce(nullif(trim(p_runner_name), ''), 'Runner'),
      'runnerPhone', p_runner_phone,
      'status', 'accepted',
      'acceptedAt', (extract(epoch from now()) * 1000)::bigint
    );

  update public.marketplace_jobs
  set
    payload = v_updated,
    updated_at = now()
  where id = p_job_id
    and (payload ->> 'status') = 'pending'
    and (payload ->> 'runnerId' is null or trim(payload ->> 'runnerId') = '');

  if not found then
    raise exception 'Could not accept job; another runner may have taken it';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.accept_marketplace_job(text, text, text) from public;
grant execute on function public.accept_marketplace_job(text, text, text) to authenticated;

-- Profiles: users read own row; admins read all (for admin console).
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.caller_is_admin());
