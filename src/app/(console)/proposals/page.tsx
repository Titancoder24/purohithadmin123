import Link from "next/link";
import { awardProposalAsAdmin } from "@/app/actions/settings";
import { PageHeading } from "@/components/page-heading";
import { getPlatformSettings, getProposalQueue } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [admin, queue, settings, query] = await Promise.all([requireAdmin(), getProposalQueue(), getPlatformSettings(), searchParams]);
  const byRequest = new Map<string, typeof queue.proposals>();
  for (const proposal of queue.proposals) byRequest.set(proposal.request_id, [...(byRequest.get(proposal.request_id) || []), proposal]);
  return <>
    <PageHeading eyebrow="Admin Console" title="Proposal queue" description="Review legacy and optional proposal requests here. Customer bidding is controlled centrally from Configuration." actions={<Link className="secondary-button" href="/settings">Booking method</Link>}/>
    <div className="notice warning">Customer bidding is {settings.biddingEnabled ? "enabled" : "disabled"}. Direct profile booking stays available.</div>
    {queue.error && <div className="notice error">{queue.error}</div>}
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
    {queue.requests.map((request) => <section className="panel" key={request.id} style={{ marginBottom: 16 }}>
      <div className="panel-heading"><div><p className="eyebrow">{request.status} · {request.payment_status}</p><h2>{request.pooja_slug}</h2><p>{request.ceremony_date} {request.ceremony_time} · {request.address}</p></div><span>{(byRequest.get(request.id) || []).length} proposals</span></div>
      {(byRequest.get(request.id) || []).map((proposal) => <div key={proposal.id} style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--line)", padding: "12px 0" }}>
        <strong>{proposal.priest_profiles?.[0]?.display_name || "Purohit"}</strong>
        <span>{money(proposal.amount_inr)}</span><span>{proposal.status}</span>
        {admin.role === "super_admin" && request.status === "open" && ["active", "submitted"].includes(proposal.status) && <form action={awardProposalAsAdmin}><input name="request_id" type="hidden" value={request.id}/><input name="proposal_id" type="hidden" value={proposal.id}/><button className="secondary-button">Select for customer</button></form>}
      </div>)}
    </section>)}
    {!queue.requests.length && <div className="empty-state roomy">No proposal requests found.</div>}
  </>;
}
