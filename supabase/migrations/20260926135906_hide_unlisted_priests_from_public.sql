alter policy "verified priests are public" on public.priest_profiles
  using (
    (verification_status = 'verified'::public.priest_verification_status and is_listed)
    or (user_id = (select auth.uid()))
    or ((select private.current_app_role()) = any (array['admin'::public.app_role, 'super_admin'::public.app_role]))
  );
