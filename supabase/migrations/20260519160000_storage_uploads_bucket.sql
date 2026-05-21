-- Runner onboarding documents + job proof uploads (app bucket id: uploads)
-- Run in Lovable Cloud → SQL (same project as VITE_SUPABASE_URL).

-- Step 1: create bucket (minimal columns — works on all Supabase versions)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

-- Step 2: policies
drop policy if exists "uploads_read" on storage.objects;
drop policy if exists "uploads_insert" on storage.objects;
drop policy if exists "uploads_update" on storage.objects;
drop policy if exists "uploads_delete" on storage.objects;

create policy "uploads_read"
  on storage.objects
  for select
  using (bucket_id = 'uploads');

create policy "uploads_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "uploads_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "uploads_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verify (should return one row):
-- select id, name, public from storage.buckets where id = 'uploads';
