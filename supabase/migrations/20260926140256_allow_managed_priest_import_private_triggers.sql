-- Supabase Auth creates managed accounts, and the service role writes their profiles.
-- Give those trusted roles only the private trigger/helper access they need.
grant usage on schema private to supabase_auth_admin, service_role;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin;
grant execute on function private.current_app_role() to service_role;
grant execute on function private.protect_priest_verification_fields() to service_role;
grant execute on function private.assign_priest_profile_slug() to service_role;
