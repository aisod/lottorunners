-- Bootstrap admin by auth.uid(), self-heal roles, relax runner moderation checks.

create table if not exists public.app_config (
  key text primary key,
  value text not null default ''
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_read" on public.app_config;
create policy "app_config_read" on public.app_config for select to authenticated using (true);

-- Add your admin login emails (comma-separated), then sign out/in or open Admin → Users:
-- insert into public.app_config (key, value) values ('admin_emails', 'you@example.com')
-- on conflict (key) do update set value = excluded.value;

create or replace function public.ensure_bootstrap_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  allowlist text;
  emails text[];
begin
  if auth.uid() is null then
    return false;
  end if;

  user_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if user_email = '' then
    select lower(email) into user_email from public.profiles where id = auth.uid();
  end if;

  -- Self-heal: primary_role admin but roles array missing admin
  update public.profiles
  set
    roles = (
      select coalesce(array_agg(distinct r), array['admin', 'customer']::text[])
      from unnest(coalesce(roles, array['customer']::text[]) || array['admin']::text[]) as r
    ),
    updated_at = now()
  where id = auth.uid()
    and primary_role = 'admin'
    and not ('admin' = any (coalesce(roles, array[]::text[])));

  select value into allowlist from public.app_config where key = 'admin_emails';

  if allowlist is not null and trim(allowlist) <> '' and user_email <> '' then
    emails := string_to_array(allowlist, ',');
    if user_email = any (
      select lower(trim(e))
      from unnest(emails) as e
      where trim(e) <> ''
    ) then
      update public.profiles
      set
        roles = (
          select coalesce(array_agg(distinct r), array['admin', 'customer']::text[])
          from unnest(coalesce(roles, array['customer']::text[]) || array['admin']::text[]) as r
        ),
        primary_role = 'admin',
        updated_at = now()
      where id = auth.uid();
    end if;
  end if;

  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        'admin' = any (coalesce(roles, array[]::text[]))
        or primary_role = 'admin'
      )
  );
end;
$$;

create or replace function public.caller_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_bootstrap_admin();
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        'admin' = any (coalesce(roles, array[]::text[]))
        or primary_role = 'admin'
      )
  );
end;
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

  perform public.ensure_bootstrap_admin();

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

revoke all on function public.ensure_bootstrap_admin() from public;
grant execute on function public.ensure_bootstrap_admin() to authenticated;

revoke all on function public.caller_is_admin() from public;
grant execute on function public.caller_is_admin() to authenticated;

revoke all on function public.admin_set_runner_status(uuid, text) from public;
grant execute on function public.admin_set_runner_status(uuid, text) to authenticated;
