-- Allow admins to persist platform settings in app_config via security definer RPC.

create or replace function public.admin_upsert_app_config(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_bootstrap_admin();

  if not public.caller_is_admin() then
    raise exception 'Admin role required';
  end if;

  if p_key is null or trim(p_key) = '' then
    raise exception 'Config key required';
  end if;

  insert into public.app_config (key, value)
  values (trim(p_key), coalesce(p_value, ''))
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.admin_upsert_app_config(text, text) from public;
grant execute on function public.admin_upsert_app_config(text, text) to authenticated;
