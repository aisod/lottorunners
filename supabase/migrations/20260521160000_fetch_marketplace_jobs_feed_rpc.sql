-- Fallback feed for clients when direct REST SELECT on marketplace_jobs fails (e.g. missing GRANTs / 405).
-- Same visibility rules as jobs_read RLS.

create or replace function public.fetch_marketplace_jobs_feed()
returns table (
  id text,
  payload jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, j.payload, j.updated_at
  from public.marketplace_jobs j
  where
    public.caller_is_admin()
    or public.job_is_open_pending(j.payload)
    or public.job_owner_customer_email(j.payload) = public.auth_runner_id()
    or public.job_owner_business_email(j.payload) = public.auth_runner_id()
    or (
      public.job_runner_email(j.payload) <> ''
      and public.job_runner_email(j.payload) = public.auth_runner_id()
    )
  order by j.updated_at desc;
$$;

revoke all on function public.fetch_marketplace_jobs_feed() from public;
grant execute on function public.fetch_marketplace_jobs_feed() to authenticated;
