create table if not exists public.notification_delivery_events (
  id bigint generated always as identity primary key,
  notification_id uuid references public.app_notifications(id) on delete cascade,
  campaign_id uuid references public.notification_campaigns(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null default 'unknown',
  channel text not null check (channel in ('in_app', 'push')),
  event text not null check (event in ('created', 'sent', 'failed', 'opened')),
  platform text check (platform is null or platform in ('ios', 'android', 'web', 'unknown')),
  event_count integer not null default 1 check (event_count > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_delivery_events_created_idx
  on public.notification_delivery_events (created_at desc);
create index if not exists notification_delivery_events_type_idx
  on public.notification_delivery_events (notification_type, created_at desc);
create index if not exists notification_delivery_events_campaign_idx
  on public.notification_delivery_events (campaign_id) where campaign_id is not null;

alter table public.notification_delivery_events enable row level security;

drop policy if exists "super admins read notification delivery events" on public.notification_delivery_events;
create policy "super admins read notification delivery events"
on public.notification_delivery_events for select to authenticated
using ((select private.current_app_role()) = 'super_admin'::public.app_role);

revoke all on public.notification_delivery_events from anon, authenticated;
grant select on public.notification_delivery_events to authenticated;
grant all on public.notification_delivery_events to service_role;

create or replace function public.capture_app_notification_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notification_delivery_events (
      notification_id, campaign_id, user_id, notification_type, channel, event, metadata, created_at
    ) values (
      new.id,
      case when (new.data->>'campaignId') ~* '^[0-9a-f-]{36}$' then (new.data->>'campaignId')::uuid else null end,
      new.user_id,
      new.type,
      'in_app',
      'created',
      jsonb_build_object('bookingId', new.booking_id, 'requestId', new.request_id),
      new.created_at
    );
  elsif new.read_at is not null and old.read_at is null then
    insert into public.notification_delivery_events (
      notification_id, campaign_id, user_id, notification_type, channel, event, metadata, created_at
    ) values (
      new.id,
      case when (new.data->>'campaignId') ~* '^[0-9a-f-]{36}$' then (new.data->>'campaignId')::uuid else null end,
      new.user_id,
      new.type,
      'in_app',
      'opened',
      jsonb_build_object('bookingId', new.booking_id, 'requestId', new.request_id),
      new.read_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists app_notification_analytics_insert on public.app_notifications;
create trigger app_notification_analytics_insert
  after insert on public.app_notifications
  for each row execute function public.capture_app_notification_analytics();

drop trigger if exists app_notification_analytics_open on public.app_notifications;
create trigger app_notification_analytics_open
  after update of read_at on public.app_notifications
  for each row execute function public.capture_app_notification_analytics();
