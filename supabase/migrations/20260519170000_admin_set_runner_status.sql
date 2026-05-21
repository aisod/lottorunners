-- Allow admins to approve/reject runner onboarding (bypass profiles_update RLS for other users).

create or replace function public.caller_is_admin()
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
      and 'admin' = any (roles)
  );
$$;

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

  if not public.caller_is_admin() then
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
      and 'runner' = any (roles)
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

revoke all on function public.caller_is_admin() from public;
grant execute on function public.caller_is_admin() to authenticated;

revoke all on function public.admin_set_runner_status(uuid, text) from public;
grant execute on function public.admin_set_runner_status(uuid, text) to authenticated;
