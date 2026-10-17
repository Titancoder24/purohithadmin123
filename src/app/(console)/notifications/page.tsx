import Link from "next/link";
import { BarChart3, BellRing, Monitor, Smartphone, UsersRound } from "lucide-react";
import { NotificationComposer } from "./notification-composer";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Campaign = {
  id: string; title: string; body: string; audience: string; status: string;
  recipient_count: number; in_app_count: number; push_success_count: number;
  push_failure_count: number; created_at: string; sent_at: string | null;
  channel: string; web_push_success_count: number; web_push_failure_count: number;
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const [query, campaignsResult, customersResult, priestsResult, iosResult, androidResult, webResult] = await Promise.all([
    searchParams,
    supabase.from("notification_campaigns").select("id,title,body,audience,channel,status,recipient_count,in_app_count,push_success_count,push_failure_count,web_push_success_count,web_push_failure_count,created_at,sent_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("role", "customer").eq("is_active", true),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("role", "priest").eq("is_active", true),
    supabase.from("push_tokens").select("id", { count: "exact", head: true }).eq("platform", "ios"),
    supabase.from("push_tokens").select("id", { count: "exact", head: true }).eq("platform", "android"),
    supabase.from("web_push_subscriptions").select("id", { count: "exact", head: true }),
  ]);
  const campaigns = (campaignsResult.data || []) as Campaign[];

  return <>
    <PageHeading eyebrow="Customer engagement" title="Push notification studio" description="Send mobile or web campaigns and manage booking, proposal, and payment notifications across devices and the in-app inbox." actions={<Link className="secondary-button" href="/notifications/analytics"><BarChart3 size={15}/>View analytics</Link>}/>
    {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    <section className="kpi-grid">
      <article className="kpi"><span className="kpi-icon orange"><UsersRound size={18}/></span><div><p>Active audience</p><strong>{(customersResult.count || 0) + (priestsResult.count || 0)}</strong><small>{customersResult.count || 0} customers · {priestsResult.count || 0} priests</small></div></article>
      <article className="kpi"><span className="kpi-icon"><Smartphone size={18}/></span><div><p>iOS devices</p><strong>{iosResult.count || 0}</strong><small>Expo token routes through APNs</small></div></article>
      <article className="kpi"><span className="kpi-icon"><Smartphone size={18}/></span><div><p>Android devices</p><strong>{androidResult.count || 0}</strong><small>Expo token routes through FCM</small></div></article>
      <article className="kpi"><span className="kpi-icon green"><Monitor size={18}/></span><div><p>Web browsers</p><strong>{webResult.count || 0}</strong><small>Registered for browser push</small></div></article>
    </section>
    <NotificationComposer/>
    <section className="table-panel">
      <div className="table-toolbar"><strong><BellRing size={15}/>Delivery history</strong><span>{campaigns.length} recent campaigns</span></div>
      <div className="data-table"><div className="table-row notification-table table-head"><span>Message</span><span>Audience</span><span>Status</span><span>Delivery</span><span>Sent</span></div>
        {campaigns.map((campaign) => <div className="table-row notification-table" key={campaign.id}><span><strong>{campaign.title}</strong><small>{campaign.body}</small></span><span>{campaign.audience} · {campaign.channel}</span><span><StatusPill status={campaign.status}/></span><span><strong>{campaign.push_success_count} mobile · {campaign.web_push_success_count} web</strong><small>{campaign.in_app_count} in-app · {campaign.push_failure_count + campaign.web_push_failure_count} push failures</small></span><span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.sent_at || campaign.created_at))}</span></div>)}
        {!campaigns.length && <div className="empty-state roomy">No campaigns have been sent yet. Your first campaign will appear here.</div>}
      </div>
    </section>
  </>;
}
