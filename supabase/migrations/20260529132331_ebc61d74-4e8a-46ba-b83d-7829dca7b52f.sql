-- Tighten marketplace_jobs INSERT: prevent customers/businesses from
-- pre-assigning a runner on insert. Runner assignment must go through
-- accept_marketplace_job (SECURITY DEFINER RPC). Admins are exempt.
DROP POLICY IF EXISTS "jobs_insert" ON public.marketplace_jobs;

CREATE POLICY "jobs_insert" ON public.marketplace_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    caller_is_admin()
    OR (
      -- Customer-created job: must own it, must not be source=business,
      -- and must NOT pre-assign a runner.
      (job_owner_customer_email(payload) = auth_runner_id())
      AND (COALESCE(payload ->> 'source', 'customer') <> 'business')
      AND (COALESCE(NULLIF(TRIM(payload ->> 'runnerId'), ''), '') = '')
      AND (COALESCE(NULLIF(TRIM(payload ->> 'runnerEmail'), ''), '') = '')
    )
    OR (
      -- Business-created job: same restriction.
      (COALESCE(payload ->> 'source', '') = 'business')
      AND (job_owner_business_email(payload) = auth_runner_id())
      AND (COALESCE(NULLIF(TRIM(payload ->> 'runnerId'), ''), '') = '')
      AND (COALESCE(NULLIF(TRIM(payload ->> 'runnerEmail'), ''), '') = '')
    )
  );