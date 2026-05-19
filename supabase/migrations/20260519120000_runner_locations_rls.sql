-- Runner locations RLS: runners may only write their own row; all authenticated users may read (tracking).

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

comment on function public.auth_runner_id() is
  'Normalized runner key for runner_locations (matches app getCurrentRunnerId() email).';

drop policy if exists "runner_locations_read" on public.runner_locations;
drop policy if exists "runner_locations_insert" on public.runner_locations;
drop policy if exists "runner_locations_update" on public.runner_locations;

-- Tracking: any signed-in user (customer, business, runner, admin) can read locations.
create policy "runner_locations_read"
  on public.runner_locations
  for select
  to authenticated
  using (true);

-- Writers: only upsert a row whose runner_id equals the signed-in user email.
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
