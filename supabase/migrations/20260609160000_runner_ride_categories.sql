-- Ride/taxi category matching: runner profiles store which ride subtypes they accept.
-- Truck, errand, and delivery jobs ignore this column entirely.

alter table public.profiles
  add column if not exists ride_categories text[] not null
  default array['standard', 'xl', 'women', 'corporate']::text[];

comment on column public.profiles.ride_categories is
  'Ride/taxi subtypes this runner accepts (standard, xl, women, corporate). Ignored unless the runner offers taxi.';

update public.profiles
set ride_categories = array['standard', 'xl', 'women', 'corporate']::text[]
where 'runner' = any (coalesce(roles, array[]::text[]))
  and (
    ride_categories is null
    or cardinality(ride_categories) = 0
  );

-- Runner self-service: update own ride categories.
create or replace function public.admin_set_runner_ride_categories(
  p_target_user_id uuid,
  p_ride_categories text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_bootstrap_admin();

  if not public.user_has_admin_role() then
    raise exception 'Admin role required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_target_user_id
      and 'runner' = any (coalesce(roles, array[]::text[]))
  ) then
    raise exception 'Target is not a runner profile';
  end if;

  select coalesce(array_agg(distinct c), array[]::text[])
  into cleaned
  from unnest(coalesce(p_ride_categories, array[]::text[])) as c
  where c in ('standard', 'xl', 'women', 'corporate');

  if cardinality(cleaned) = 0 then
    cleaned := array['standard', 'xl', 'women', 'corporate']::text[];
  end if;

  update public.profiles
  set ride_categories = cleaned, updated_at = now()
  where id = p_target_user_id;
end;
$$;

revoke all on function public.admin_set_runner_ride_categories(uuid, text[]) from public;
grant execute on function public.admin_set_runner_ride_categories(uuid, text[]) to authenticated;

-- Admin manual assignment (bypasses ride-category filter).
create or replace function public.admin_assign_marketplace_job(
  p_job_id text,
  p_runner_email text,
  p_runner_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_runner_email text;
  v_runner_name text;
  v_current jsonb;
  v_updated jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_bootstrap_admin();

  if not public.user_has_admin_role() then
    raise exception 'Admin role required';
  end if;

  v_runner_email := lower(trim(coalesce(p_runner_email, '')));
  if v_runner_email = '' then
    raise exception 'Runner email is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where lower(email) = v_runner_email
      and 'runner' = any (coalesce(roles, array[]::text[]))
      and runner_status = 'approved'
  ) then
    raise exception 'Runner not found or not approved';
  end if;

  select coalesce(nullif(trim(p_runner_name), ''), display_name, split_part(email, '@', 1))
  into v_runner_name
  from public.profiles
  where lower(email) = v_runner_email
  limit 1;

  select payload into v_current
  from public.marketplace_jobs
  where id = p_job_id
  for update;

  if v_current is null then
    raise exception 'Job not found';
  end if;

  if (v_current ->> 'status') is distinct from 'pending' then
    raise exception 'Only pending jobs can be assigned';
  end if;

  v_updated := v_current
    || jsonb_build_object(
      'runnerId', v_runner_email,
      'runnerEmail', v_runner_email,
      'runnerName', coalesce(v_runner_name, 'Runner'),
      'status', 'accepted',
      'acceptedAt', (extract(epoch from now()) * 1000)::bigint
    );

  update public.marketplace_jobs
  set payload = v_updated, updated_at = now()
  where id = p_job_id;

  return v_updated;
end;
$$;

revoke all on function public.admin_assign_marketplace_job(text, text, text) from public;
grant execute on function public.admin_assign_marketplace_job(text, text, text) to authenticated;
