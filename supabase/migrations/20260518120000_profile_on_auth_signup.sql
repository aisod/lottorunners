-- Create public.profiles when a new auth user is created (fixes signup when email
-- confirmation is enabled and the client has no session for RLS inserts).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  role_list text[];
  primary_role text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  if jsonb_typeof(meta->'roles') = 'array' then
    select coalesce(array_agg(value), array['customer']::text[])
    into role_list
    from jsonb_array_elements_text(meta->'roles') as value;
  else
    role_list := array['customer']::text[];
  end if;

  if coalesce(array_length(role_list, 1), 0) = 0 then
    role_list := array['customer']::text[];
  end if;

  primary_role := nullif(trim(meta->>'primary_role'), '');
  if primary_role is null then
    primary_role := role_list[1];
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    roles,
    primary_role,
    runner_status,
    runner_stage
  )
  values (
    new.id,
    coalesce(new.email, nullif(trim(meta->>'email'), '')),
    nullif(trim(meta->>'display_name'), ''),
    nullif(trim(meta->>'phone'), ''),
    role_list,
    primary_role,
    nullif(trim(meta->>'runner_status'), ''),
    nullif(trim(meta->>'runner_stage'), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
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
