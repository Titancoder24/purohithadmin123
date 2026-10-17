insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-banners', 'app-banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload app banners" on storage.objects;
create policy "admins upload app banners" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-banners'
    and (select private.current_app_role()) = any (array['admin'::public.app_role, 'super_admin'::public.app_role])
  );

drop policy if exists "admins manage app banners" on storage.objects;
create policy "admins manage app banners" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-banners'
    and (select private.current_app_role()) = any (array['admin'::public.app_role, 'super_admin'::public.app_role])
  );
