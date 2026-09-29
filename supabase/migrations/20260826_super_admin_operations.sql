alter table public.app_users
  add column if not exists moderation_note text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

create index if not exists app_users_moderated_by_idx on public.app_users(moderated_by);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reported_user_id uuid not null references public.app_users(id) on delete cascade,
  reported_by uuid references public.app_users(id) on delete set null,
  category text not null check (category in ('identity','conduct','spam','payment','safety','other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution_note text not null default '',
  resolved_by uuid references public.app_users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_reports_status_created_idx on public.user_reports(status, created_at desc);
create index if not exists user_reports_reported_user_idx on public.user_reports(reported_user_id, created_at desc);
alter table public.user_reports enable row level security;

create policy "authenticated users create reports" on public.user_reports for insert to authenticated
with check (reported_by = (select auth.uid()) and reported_user_id <> (select auth.uid()));
create policy "admins read reports" on public.user_reports for select to authenticated
using ((select private.current_app_role()) = any(array['admin'::public.app_role,'super_admin'::public.app_role,'support'::public.app_role]));
create policy "admins update reports" on public.user_reports for update to authenticated
using ((select private.current_app_role()) = any(array['admin'::public.app_role,'super_admin'::public.app_role]))
with check ((select private.current_app_role()) = any(array['admin'::public.app_role,'super_admin'::public.app_role]));

create table if not exists public.admin_user_invites (
  id uuid primary key default gen_random_uuid(), email text not null, full_name text not null default '',
  role public.app_role not null check (role in ('customer','priest','support','admin')),
  status text not null default 'pending' check (status in ('pending','sent','accepted','failed','cancelled')),
  invited_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references public.app_users(id) on delete restrict,
  error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists admin_user_invites_pending_email_idx on public.admin_user_invites(lower(email)) where status in ('pending','sent');
create index if not exists admin_user_invites_invited_by_idx on public.admin_user_invites(invited_by);
create index if not exists admin_user_invites_invited_user_idx on public.admin_user_invites(invited_user_id);
alter table public.admin_user_invites enable row level security;
create policy "admins manage invitations" on public.admin_user_invites for all to authenticated
using ((select private.current_app_role()) = any(array['admin'::public.app_role,'super_admin'::public.app_role]))
with check ((select private.current_app_role()) = any(array['admin'::public.app_role,'super_admin'::public.app_role]));

drop policy if exists "users update their safe profile fields" on public.app_users;
drop policy if exists "super admins update other accounts" on public.app_users;
create policy "profile owners and super admins update accounts" on public.app_users for update to authenticated
using ((select auth.uid()) = id or ((select private.current_app_role()) = 'super_admin'::public.app_role and id <> (select auth.uid())))
with check (
  ((select auth.uid()) = id and role = (select existing.role from public.app_users existing where existing.id = (select auth.uid())) and is_active = (select existing.is_active from public.app_users existing where existing.id = (select auth.uid())))
  or ((select private.current_app_role()) = 'super_admin'::public.app_role and id <> (select auth.uid()) and role <> 'super_admin'::public.app_role)
);
