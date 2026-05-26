-- Fix: caller_is_admin() must not UPDATE during SELECT (RLS runs in read-only transactions).
-- Bootstrap admin only via explicit ensure_bootstrap_admin() RPC (login / admin layout).

create or replace function public.user_has_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        'admin' = any (coalesce(roles, array[]::text[]))
        or primary_role = 'admin'
      )
  );
$$;

revoke all on function public.user_has_admin_role() from public;
grant execute on function public.user_has_admin_role() to authenticated;

-- Read-only check for RLS policies (SELECT must not write).
create or replace function public.caller_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_admin_role();
$$;

-- RPCs that need promotion from admin_emails still bootstrap explicitly.
create or replace function public.admin_set_runner_status(
  p_target_user_id uuid,
  p_runner_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stage text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_bootstrap_admin();

  if not public.user_has_admin_role() then
    raise exception 'Admin role required';
  end if;

  if p_runner_status not in (
    'approved',
    'rejected',
    'pending_verification',
    'in_progress',
    'not_started',
    'suspended'
  ) then
    raise exception 'Invalid runner status';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_target_user_id
      and (
        'runner' = any (coalesce(roles, array[]::text[]))
        or primary_role = 'runner'
        or runner_status is not null
      )
  ) then
    raise exception 'Target is not a runner profile';
  end if;

  stage := case
    when p_runner_status = 'approved' then 'dashboard'
    when p_runner_status in ('pending_verification', 'rejected') then 'verification'
    else null
  end;

  update public.profiles
  set
    runner_status = p_runner_status,
    runner_stage = coalesce(stage, runner_stage),
    updated_at = now()
  where id = p_target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

-- Admin user directory (bypasses RLS; requires admin role after optional bootstrap).
create or replace function public.fetch_profiles_for_admin()
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_bootstrap_admin();

  if not public.user_has_admin_role() then
    return;
  end if;

  return query
  select p.*
  from public.profiles p
  order by p.updated_at desc nulls last;
end;
$$;

revoke all on function public.fetch_profiles_for_admin() from public;
grant execute on function public.fetch_profiles_for_admin() to authenticated;

-- Profiles SELECT policy: read-only admin check (no UPDATE in policy).
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.user_has_admin_role());
