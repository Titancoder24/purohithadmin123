create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 220),
  audience text not null check (audience in ('all', 'customers', 'priests')),
  deep_link text not null default 'notifications' check (deep_link in ('notifications', 'home', 'bookings', 'priests', 'profile')),
  status text not null default 'sending' check (status in ('sending', 'sent', 'partial', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  in_app_count integer not null default 0 check (in_app_count >= 0),
  push_token_count integer not null default 0 check (push_token_count >= 0),
  push_success_count integer not null default 0 check (push_success_count >= 0),
  push_failure_count integer not null default 0 check (push_failure_count >= 0),
  error_message text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_campaigns_created_at_idx
  on public.notification_campaigns (created_at desc);
create index if not exists notification_campaigns_status_idx
  on public.notification_campaigns (status, created_at desc);
create index if not exists notification_campaigns_created_by_idx
  on public.notification_campaigns (created_by);

alter table public.notification_campaigns enable row level security;

drop policy if exists "super admins read notification campaigns" on public.notification_campaigns;
create policy "super admins read notification campaigns"
on public.notification_campaigns for select to authenticated
using ((select private.current_app_role()) = 'super_admin'::public.app_role);

drop policy if exists "super admins create notification campaigns" on public.notification_campaigns;
create policy "super admins create notification campaigns"
on public.notification_campaigns for insert to authenticated
with check (
  (select private.current_app_role()) = 'super_admin'::public.app_role
  and created_by = (select auth.uid())
);

drop policy if exists "super admins update notification campaigns" on public.notification_campaigns;
create policy "super admins update notification campaigns"
on public.notification_campaigns for update to authenticated
using ((select private.current_app_role()) = 'super_admin'::public.app_role)
with check ((select private.current_app_role()) = 'super_admin'::public.app_role);

revoke all on public.notification_campaigns from anon;
grant select, insert, update on public.notification_campaigns to authenticated;
grant all on public.notification_campaigns to service_role;
