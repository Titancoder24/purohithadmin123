import Link from "next/link";
import { Activity, ArrowLeft, BellRing, CheckCheck, MousePointerClick, Send, Smartphone } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationTrendChart, NotificationTypeChart } from "./notification-analytics-charts";

type InboxRow = { id: string; type: string; title: string; read_at: string | null; created_at: string };
type DeliveryRow = { channel: string; event: string; event_count: number; platform: string | null; notification_type: string; created_at: string };
type CampaignRow = { push_success_count: number; push_failure_count: number; web_push_success_count: number; web_push_failure_count: number; recipient_count: number; created_at: string };

const typeNames: Record<string, string> = {
  payment_confirmed: "Payment confirmed", booking_accepted: "Purohit accepted", proposal_received: "New proposal",
  proposal_updated: "Proposal updated", proposal_selected: "Quote selected", booking_request: "Booking request",
  open_request: "Open request", marketing: "Marketing", booking_declined: "Booking declined",
};

export default async function NotificationAnalyticsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  // Server-rendered operational data intentionally uses the request time as its rolling-window anchor.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  const cutoff = new Date(requestTime - 30 * 86400000).toISOString();
  const [inboxResult, deliveryResult, campaignsResult, tokenResult, webResult] = await Promise.all([
    supabase.from("app_notifications").select("id,type,title,read_at,created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(5000),
    supabase.from("notification_delivery_events").select("channel,event,event_count,platform,notification_type,created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(5000),
    supabase.from("notification_campaigns").select("push_success_count,push_failure_count,web_push_success_count,web_push_failure_count,recipient_count,created_at").gte("created_at", cutoff),
    supabase.from("push_tokens").select("id", { count: "exact", head: true }),
    supabase.from("web_push_subscriptions").select("id", { count: "exact", head: true }),
  ]);
  const inbox = (inboxResult.data || []) as InboxRow[];
  const deliveries = (deliveryResult.data || []) as DeliveryRow[];
  const campaigns = (campaignsResult.data || []) as CampaignRow[];
  const opened = inbox.filter((row) => row.read_at).length;
  const transactionalPush = deliveries.filter((row) => row.notification_type !== "marketing");
  const pushSent = transactionalPush.filter((row) => row.channel === "push" && row.event === "sent").reduce((sum, row) => sum + row.event_count, 0) + campaigns.reduce((sum, row) => sum + row.push_success_count + row.web_push_success_count, 0);
  const pushFailed = transactionalPush.filter((row) => row.channel === "push" && row.event === "failed").reduce((sum, row) => sum + row.event_count, 0) + campaigns.reduce((sum, row) => sum + row.push_failure_count + row.web_push_failure_count, 0);
  const webSent = deliveries.filter((row) => row.channel === "push" && row.platform === "web" && row.event === "sent").reduce((sum, row) => sum + row.event_count, 0);
  const openRate = inbox.length ? Math.round((opened / inbox.length) * 100) : 0;
  const deliveryRate = pushSent + pushFailed ? Math.round((pushSent / (pushSent + pushFailed)) * 100) : 0;
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(requestTime - (13 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date), created: 0, opened: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  inbox.forEach((row) => { const item = byDay.get(row.created_at.slice(0, 10)); if (item) item.created += 1; if (row.read_at) { const openItem = byDay.get(row.read_at.slice(0, 10)); if (openItem) openItem.opened += 1; } });
  const typeCounts = new Map<string, number>();
  inbox.forEach((row) => typeCounts.set(row.type, (typeCounts.get(row.type) || 0) + 1));
  const types = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([type, value]) => ({ label: typeNames[type] || type.replaceAll("_", " "), value }));
  const recent = inbox.slice(0, 12);

  return <>
    <PageHeading eyebrow="Customer engagement" title="Push notification analytics" description="Monitor in-app engagement, device push delivery, and transactional notification activity from one production dashboard." actions={<Link className="secondary-button" href="/notifications"><ArrowLeft size={15}/>Campaign studio</Link>}/>
    {deliveryResult.error && <div className="notice warning"><strong>Push event tracking is waiting for the analytics migration.</strong><span>Inbox and campaign metrics below are live; device event detail will populate after deployment.</span></div>}
    <section className="kpi-grid notification-kpis">
      <article className="kpi"><span className="kpi-icon orange"><BellRing size={18}/></span><div><p>In-app created</p><strong>{inbox.length.toLocaleString("en-IN")}</strong><small>Last 30 days</small></div></article>
      <article className="kpi"><span className="kpi-icon green"><MousePointerClick size={18}/></span><div><p>Inbox open rate</p><strong>{openRate}%</strong><small>{opened.toLocaleString("en-IN")} notifications opened</small></div></article>
      <article className="kpi"><span className="kpi-icon"><Send size={18}/></span><div><p>Push delivery</p><strong>{deliveryRate}%</strong><small>{pushSent.toLocaleString("en-IN")} sent · {pushFailed.toLocaleString("en-IN")} failed</small></div></article>
      <article className="kpi"><span className="kpi-icon"><Smartphone size={18}/></span><div><p>Registered endpoints</p><strong>{((tokenResult.count || 0) + (webResult.count || 0)).toLocaleString("en-IN")}</strong><small>{webResult.count || 0} web · {tokenResult.count || 0} mobile</small></div></article>
    </section>
    <section className="notification-analytics-grid">
      <article className="panel notification-chart-panel"><div className="panel-heading"><div><p className="eyebrow">14-day trend</p><h2>Inbox creation and opens</h2></div><span className="legend"><i/>Created <i className="dark"/>Opened</span></div><NotificationTrendChart data={days}/></article>
      <article className="panel notification-chart-panel"><div className="panel-heading"><div><p className="eyebrow">Event mix</p><h2>Notifications by workflow</h2></div><Activity size={18}/></div>{types.length ? <NotificationTypeChart data={types}/> : <div className="empty-chart"><strong>No events in this period</strong><span>Transactional and campaign events appear after delivery.</span></div>}</article>
    </section>
    <section className="notification-insights">
      <article><span><CheckCheck size={18}/></span><div><p>Most active workflow</p><strong>{types[0]?.label || "Waiting for activity"}</strong><small>{types[0]?.value || 0} inbox notifications in the last 30 days</small></div></article>
      <article><span><Send size={18}/></span><div><p>Marketing reach</p><strong>{campaigns.reduce((sum, row) => sum + row.recipient_count, 0).toLocaleString("en-IN")} recipients</strong><small>Across {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</small></div></article>
      <article><span><BellRing size={18}/></span><div><p>Unread opportunity</p><strong>{(inbox.length - opened).toLocaleString("en-IN")} messages</strong><small>Available inside the customer and priest inbox</small></div></article>
      <article><span><Send size={18}/></span><div><p>Web push sent</p><strong>{webSent.toLocaleString("en-IN")}</strong><small>Browser deliveries in the last 30 days</small></div></article>
    </section>
    <section className="table-panel"><div className="table-toolbar"><strong><BellRing size={15}/>Recent notification activity</strong><span>{recent.length} latest events</span></div><div className="data-table"><div className="table-row notification-event-table table-head"><span>Notification</span><span>Workflow</span><span>Channel</span><span>Engagement</span><span>Created</span></div>{recent.map((row) => <div className="table-row notification-event-table" key={row.id}><span><strong>{row.title}</strong><small>{row.id.slice(0, 8)}</small></span><span>{typeNames[row.type] || row.type.replaceAll("_", " ")}</span><span>In-app + push</span><span className={row.read_at ? "notification-opened" : "notification-unread"}>{row.read_at ? "Opened" : "Unread"}</span><span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}</span></div>)}{!recent.length && <div className="empty-state roomy">No notification activity has been recorded in the last 30 days.</div>}</div></section>
  </>;
}
