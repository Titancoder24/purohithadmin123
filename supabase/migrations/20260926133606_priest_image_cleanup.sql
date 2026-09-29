create policy "admins list priest images"
on storage.objects for select to authenticated
using (
  bucket_id = 'priest-images'
  and (select private.current_app_role()) = any (
    array['admin'::public.app_role, 'super_admin'::public.app_role]
  )
);

create policy "admins delete priest images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'priest-images'
  and (select private.current_app_role()) = any (
    array['admin'::public.app_role, 'super_admin'::public.app_role]
  )
);
