-- Safe profile creation for signup (Lovable Cloud): column guards, trigger, RPC fallback, orphan repair.

-- Ensure columns exist on older profiles tables
alter table public.profiles
  add column if not exists roles text[] not null default array['customer']::text[];

alter table public.profiles
  add column if not exists documents jsonb not null default '{}'::jsonb;

create or replace function public.parse_roles_from_metadata(meta jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
  with parsed as (
    select coalesce(
      array(
        select distinct trim(both from x)
        from unnest(string_to_array(coalesce(meta ->> 'roles', ''), ',')) as x
        where trim(both from x) <> ''
      ),
      array[]::text[]
    ) as roles
  )
  select case
    when coalesce(array_length(parsed.roles, 1), 0) = 0 then array['customer']::text[]
    else parsed.roles
  end
  from parsed;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_roles text[];
begin
  user_roles := public.parse_roles_from_metadata(meta);

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    roles,
    primary_role,
    runner_status,
    runner_stage,
    documents,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    nullif(meta ->> 'display_name', ''),
    nullif(meta ->> 'phone', ''),
    user_roles,
    nullif(meta ->> 'primary_role', ''),
    nullif(meta ->> 'runner_status', ''),
    nullif(meta ->> 'runner_stage', ''),
    '{}'::jsonb,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    roles = excluded.roles,
    primary_role = coalesce(excluded.primary_role, public.profiles.primary_role),
    runner_status = coalesce(excluded.runner_status, public.profiles.runner_status),
    runner_stage = coalesce(excluded.runner_stage, public.profiles.runner_stage),
    updated_at = now();

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Callable from the app right after signUp (authenticated session required).
create or replace function public.ensure_profile_for_user(
  p_email text,
  p_phone text default null,
  p_roles text[] default array['customer']::text[],
  p_primary_role text default 'customer',
  p_runner_status text default null,
  p_runner_stage text default null,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  safe_roles text[];
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  safe_roles := coalesce(p_roles, array['customer']::text[]);
  if coalesce(array_length(safe_roles, 1), 0) = 0 then
    safe_roles := array['customer']::text[];
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    roles,
    primary_role,
    runner_status,
    runner_stage,
    documents,
    updated_at
  )
  values (
    uid,
    lower(trim(p_email)),
    nullif(trim(coalesce(p_display_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    safe_roles,
    nullif(trim(coalesce(p_primary_role, '')), ''),
    nullif(trim(coalesce(p_runner_status, '')), ''),
    nullif(trim(coalesce(p_runner_stage, '')), ''),
    '{}'::jsonb,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    roles = excluded.roles,
    primary_role = coalesce(excluded.primary_role, public.profiles.primary_role),
    runner_status = coalesce(excluded.runner_status, public.profiles.runner_status),
    runner_stage = coalesce(excluded.runner_stage, public.profiles.runner_stage),
    updated_at = now();

  return uid;
end;
$$;

revoke all on function public.ensure_profile_for_user(text, text, text[], text, text, text, text) from public;
grant execute on function public.ensure_profile_for_user(text, text, text[], text, text, text, text) to authenticated;

-- Repair orphans (run safe to repeat).
insert into public.profiles (id, email, roles, documents, updated_at)
select
  u.id,
  lower(u.email),
  public.parse_roles_from_metadata(coalesce(u.raw_user_meta_data, '{}'::jsonb)),
  '{}'::jsonb,
  now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
