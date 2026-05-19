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

-- Jobs: authenticated users can read/write (app enforces role logic)
drop policy if exists "jobs_read" on public.marketplace_jobs;
drop policy if exists "jobs_insert" on public.marketplace_jobs;
drop policy if exists "jobs_update" on public.marketplace_jobs;
create policy "jobs_read" on public.marketplace_jobs for select to authenticated using (true);
create policy "jobs_insert" on public.marketplace_jobs for insert to authenticated with check (true);
create policy "jobs_update" on public.marketplace_jobs for update to authenticated using (true);

-- Realtime
alter publication supabase_realtime add table public.marketplace_jobs;

-- Auto-create profile on auth signup (required when email confirmation leaves no client session)
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
    id, email, display_name, phone, roles, primary_role, runner_status, runner_stage
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

-- Storage policies (run after creating public bucket "uploads")
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict do nothing;

drop policy if exists "uploads_read" on storage.objects;
drop policy if exists "uploads_insert" on storage.objects;
create policy "uploads_read" on storage.objects for select using (bucket_id = 'uploads');
create policy "uploads_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
