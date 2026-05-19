-- Lotto Runners production schema (Supabase SQL editor)
-- 1. Run this script
-- 2. Create storage bucket "uploads" (public) in Dashboard → Storage
-- 3. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
-- 4. Auth → disable email confirm for dev OR confirm emails manually

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  phone text,
  -- Portal roles: customer, runner, business. Add admin only via Supabase dashboard/SQL for staff accounts.
  roles text[] not null default array['customer']::text[],
  primary_role text,
  runner_status text,
  runner_stage text,
  documents jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_jobs (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_jobs_status_idx
  on public.marketplace_jobs ((payload->>'status'));

create index if not exists marketplace_jobs_updated_idx
  on public.marketplace_jobs (updated_at desc);

alter table public.profiles enable row level security;
alter table public.marketplace_jobs enable row level security;

-- Profiles: users read all (display names), write own row
drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_write" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on auth signup (works when email confirmation leaves no client session).
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

-- Jobs: authenticated users can read/write (app enforces role logic)
drop policy if exists "jobs_read" on public.marketplace_jobs;
drop policy if exists "jobs_insert" on public.marketplace_jobs;
drop policy if exists "jobs_update" on public.marketplace_jobs;
create policy "jobs_read" on public.marketplace_jobs for select to authenticated using (true);
create policy "jobs_insert" on public.marketplace_jobs for insert to authenticated with check (true);
create policy "jobs_update" on public.marketplace_jobs for update to authenticated using (true);

-- Runner live GPS (updated while online / on active job)
create table if not exists public.runner_locations (
  runner_id text primary key,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  updated_at timestamptz not null default now()
);

create index if not exists runner_locations_updated_idx
  on public.runner_locations (updated_at desc);

alter table public.runner_locations enable row level security;

-- Match signed-in user email to runner_id (same key as getCurrentRunnerId() in the app).
create or replace function public.auth_runner_id()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      (select email from public.profiles where id = auth.uid() limit 1)
    )
  );
$$;

drop policy if exists "runner_locations_read" on public.runner_locations;
drop policy if exists "runner_locations_insert" on public.runner_locations;
drop policy if exists "runner_locations_update" on public.runner_locations;

create policy "runner_locations_read"
  on public.runner_locations
  for select
  to authenticated
  using (true);

create policy "runner_locations_insert"
  on public.runner_locations
  for insert
  to authenticated
  with check (lower(runner_id) = public.auth_runner_id());

create policy "runner_locations_update"
  on public.runner_locations
  for update
  to authenticated
  using (lower(runner_id) = public.auth_runner_id())
  with check (lower(runner_id) = public.auth_runner_id());

-- Realtime
alter publication supabase_realtime add table public.marketplace_jobs;
alter publication supabase_realtime add table public.runner_locations;

-- Storage policies (run after creating public bucket "uploads")
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict do nothing;

drop policy if exists "uploads_read" on storage.objects;
drop policy if exists "uploads_insert" on storage.objects;
create policy "uploads_read" on storage.objects for select using (bucket_id = 'uploads');
create policy "uploads_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
