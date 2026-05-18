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

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

drop policy if exists "jobs_read" on public.marketplace_jobs;
drop policy if exists "jobs_insert" on public.marketplace_jobs;
drop policy if exists "jobs_update" on public.marketplace_jobs;
create policy "jobs_read" on public.marketplace_jobs for select to authenticated using (true);
create policy "jobs_insert" on public.marketplace_jobs for insert to authenticated with check (true);
create policy "jobs_update" on public.marketplace_jobs for update to authenticated using (true);

alter publication supabase_realtime add table public.marketplace_jobs;