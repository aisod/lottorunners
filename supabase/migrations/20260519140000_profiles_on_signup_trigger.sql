-- Create public.profiles when auth.users row is inserted (works with email confirmation / no client session).
-- Also backfills profiles for auth users created before this trigger existed.

create or replace function public.parse_roles_from_metadata(meta jsonb)
returns text[]
language sql
immutable
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
  if coalesce(array_length(user_roles, 1), 0) = 0 then
    user_roles := array['customer']::text[];
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
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    roles = excluded.roles,
    primary_role = coalesce(excluded.primary_role, public.profiles.primary_role),
    runner_status = coalesce(excluded.runner_status, public.profiles.runner_status),
    runner_stage = coalesce(excluded.runner_stage, public.profiles.runner_stage),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Repair auth accounts that exist without a profiles row (orphans from failed client-only signup).
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
