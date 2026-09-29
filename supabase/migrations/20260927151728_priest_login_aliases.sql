create table if not exists public.priest_login_aliases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (
    username = lower(username)
    and username ~ '^[a-z0-9._-]{3,32}$'
  ),
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists priest_login_aliases_username_lower_idx
  on public.priest_login_aliases (lower(username));
create index if not exists priest_login_aliases_created_by_idx
  on public.priest_login_aliases (created_by);

alter table public.priest_login_aliases enable row level security;

revoke all on table public.priest_login_aliases from anon, authenticated;
grant all on table public.priest_login_aliases to service_role;
grant select, insert, update, delete on table public.priest_login_aliases to authenticated;

create policy "super admins manage priest login aliases"
on public.priest_login_aliases for all to authenticated
using ((select private.current_app_role()) = 'super_admin'::public.app_role)
with check ((select private.current_app_role()) = 'super_admin'::public.app_role);
