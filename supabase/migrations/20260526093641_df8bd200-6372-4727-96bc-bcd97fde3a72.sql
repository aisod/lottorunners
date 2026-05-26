
-- 1) Prevent self-escalation on profiles: lock immutable role/status fields on UPDATE
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND roles IS NOT DISTINCT FROM (SELECT roles FROM public.profiles WHERE id = auth.uid())
    AND primary_role IS NOT DISTINCT FROM (SELECT primary_role FROM public.profiles WHERE id = auth.uid())
    AND runner_status IS NOT DISTINCT FROM (SELECT runner_status FROM public.profiles WHERE id = auth.uid())
    AND runner_stage IS NOT DISTINCT FROM (SELECT runner_stage FROM public.profiles WHERE id = auth.uid())
  );

-- Admin override (admins can update any profile, including roles/status)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- 2) Lock search_path on helper functions
ALTER FUNCTION public.job_owner_business_email(jsonb) SET search_path = public;
ALTER FUNCTION public.job_runner_email(jsonb) SET search_path = public;
ALTER FUNCTION public.job_is_open_pending(jsonb) SET search_path = public;
ALTER FUNCTION public.job_owner_customer_email(jsonb) SET search_path = public;
