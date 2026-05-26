-- PostgREST API role grants (required on Supabase projects created after May 2026
-- when "Automatically expose new tables" is off). Without these, REST calls can fail
-- with permission denied (42501) or method errors.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.marketplace_jobs to authenticated;
grant insert, update on public.marketplace_jobs to authenticated;
grant select, insert, update, delete on public.marketplace_jobs to service_role;

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

grant select on public.runner_locations to authenticated;
grant insert, update on public.runner_locations to authenticated;
grant select, insert, update, delete on public.runner_locations to service_role;

grant select on public.app_config to authenticated;
grant select, insert, update, delete on public.app_config to service_role;
