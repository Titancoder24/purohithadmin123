insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pooja-images',
  'pooja-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload pooja images" on storage.objects;

create policy "admins upload pooja images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pooja-images'
  and (select private.current_app_role()) = any (
    array['admin'::public.app_role, 'super_admin'::public.app_role]
  )
);
