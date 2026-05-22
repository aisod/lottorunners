-- Align auth_runner_id() with JWT email (lowercase) + profiles fallback for RLS on runner_locations.

create or replace function public.auth_runner_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(
    coalesce(
      nullif(trim(auth.jwt() ->> 'email'), ''),
      nullif(trim(auth.jwt() -> 'user_metadata' ->> 'email'), ''),
      (select lower(trim(email)) from public.profiles where id = auth.uid() limit 1)
    )
  );
$$;

comment on function public.auth_runner_id() is
  'Lowercase runner key from JWT email or profiles.email; matches app getCurrentRunnerId().';
