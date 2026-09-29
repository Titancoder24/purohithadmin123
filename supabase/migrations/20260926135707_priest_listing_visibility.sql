alter table public.priest_profiles
  add column if not exists is_listed boolean not null default true;

create index if not exists priest_profiles_public_visibility_idx
  on public.priest_profiles (verification_status, is_listed, rating desc)
  where submitted_at is not null;
