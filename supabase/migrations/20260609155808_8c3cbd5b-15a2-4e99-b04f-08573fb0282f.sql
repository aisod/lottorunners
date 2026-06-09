DROP POLICY IF EXISTS "runner_locations_read" ON public.runner_locations;

CREATE POLICY "runner_locations_read"
  ON public.runner_locations
  FOR SELECT
  TO authenticated
  USING (
    lower(runner_id) = public.auth_runner_id()
    OR public.caller_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.marketplace_jobs j
      WHERE lower(COALESCE(j.payload ->> 'runnerId', '')) = lower(runner_locations.runner_id)
        AND lower(COALESCE(j.payload ->> 'customerEmail', j.payload ->> 'customerId', '')) = public.auth_runner_id()
        AND COALESCE(j.payload ->> 'status', '') = ANY (ARRAY['accepted','en_route','arrived','in_progress'])
    )
  );