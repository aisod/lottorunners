-- Remove open "claim pending job via UPDATE" path; assignment must use accept_marketplace_job RPC.
-- Owners (customer/business) and assigned runners can still update their jobs.

create or replace function public.caller_can_modify_job(p_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.caller_is_admin()
    or lower(coalesce(p_payload->>'customerId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'customerEmail', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'runnerId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'runnerEmail', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'businessId', '')) = public.auth_runner_id()
    or lower(coalesce(p_payload->>'businessEmail', '')) = public.auth_runner_id();
$$;
