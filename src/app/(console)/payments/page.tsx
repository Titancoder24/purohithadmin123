import { AlertTriangle, BadgeIndianRupee, CheckCircle2, Clock3, LocateFixed, ReceiptText, ShieldCheck } from "lucide-react";
import { approveProviderRelease } from "@/app/actions/content";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getCashfreePaymentData, getPlatformSettings } from "@/lib/data";

const relation = <T,>(value: T | T[] | null | undefined) => Array.isArray(value) ? value[0] : value;
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(paise || 0) / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [data, query, { serviceFeePercent }] = await Promise.all([getCashfreePaymentData(), searchParams, getPlatformSettings()]);
  const paid = data.orders.filter((order) => order.status === "paid");
  const held = data.earnings.filter((earning) => ["held", "available", "release_pending"].includes(earning.status));

  return <>
    <PageHeading
      eyebrow="Cashfree operations"
      title="Payments, holds and disputes"
      description="Monitor signed provider events, customer receipts, held provider earnings, refunds, and disputes from one operational view."
    />
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    <section className="kpi-grid">
      <div className="kpi"><BadgeIndianRupee/><span><small>Paid volume</small><strong>{money(paid.reduce((sum, item) => sum + Number(item.amount_paise), 0))}</strong><em>{paid.length} confirmed orders</em></span></div>
      <div className="kpi"><Clock3/><span><small>Provider funds held</small><strong>{money(held.reduce((sum, item) => sum + Number(item.net_paise), 0))}</strong><em>{held.length} earnings records</em></span></div>
      <div className="kpi"><AlertTriangle/><span><small>Open disputes</small><strong>{data.disputes.filter((item) => ["open", "under_review"].includes(item.status)).length}</strong><em>Cashfree chargeback queue</em></span></div>
      <div className="kpi"><ShieldCheck/><span><small>Verified events</small><strong>{data.events.filter((event) => event.signature_valid).length}</strong><em>Latest 100 webhooks</em></span></div>
    </section>

    <div className="table-panel">
      <div className="table-toolbar"><strong>{data.orders.length} Cashfree orders</strong><span>Receipt tokens appear only after confirmed payment.</span></div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Order</span><span>Amount</span><span>Customer receipt</span><span>Provider state</span><span>Created</span></div>
        {data.orders.map((order) => {
          const booking = relation(order.bookings);
          const report = data.reports.find((item) => item.payment_order_id === order.id);
          return <div className="table-row payments-table" key={order.id}>
            <span><strong>{booking?.pooja_name || order.pooja_slug || "Ceremony booking"}</strong><small>{order.merchant_order_id}</small><small>{booking?.customer_name || "Customer"} · {booking?.priest_name || "Purohit"}</small></span>
            <span><strong>{money(order.amount_paise)}</strong><small>{order.environment}</small></span>
            <span><strong>{order.status === "paid" ? order.customer_receipt_token : "Issued after payment"}</strong>{report ? <a className="inline-link" href={`/api/invoices/${report.id}`}>Download {report.invoice_number}</a> : <small>{booking?.invoice_no || "Invoice pending"}</small>}</span>
            <span><StatusPill status={order.status}/><small>{order.provider_status || "Awaiting provider event"}</small></span>
            <span><strong>{date(order.created_at)}</strong><small>{order.paid_at ? `Paid ${date(order.paid_at)}` : "Not paid"}</small></span>
          </div>;
        })}
        {!data.orders.length && <div className="empty-state roomy">No Cashfree orders have been created yet.</div>}
      </div>
    </div>

    <div className="table-panel">
      <div className="table-toolbar"><strong>Live arrival tracking</strong><span>Coordinates appear only after the customer and assigned purohit consent.</span></div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Booking</span><span>Status</span><span>Customer</span><span>Purohit</span><span>Latest GPS</span></div>
        {data.tracking.map((session) => {
          const location = data.locations.find((item) => item.booking_id === session.booking_id);
          return <div className="table-row payments-table" key={session.booking_id}>
            <span><strong>{session.booking_id}</strong><small>{session.started_at ? `Started ${date(session.started_at)}` : "Not started"}</small></span>
            <span><StatusPill status={session.status}/></span>
            <span><strong>{session.customer_consented_at ? "Consented" : "Off"}</strong></span>
            <span><strong>{session.priest_consented_at ? "Sharing enabled" : "Off"}</strong></span>
            <span>{location ? <><LocateFixed size={15}/><strong>{Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}</strong><small>{date(location.recorded_at)}</small></> : <small>No location shared</small>}</span>
          </div>;
        })}
        {!data.tracking.length && <div className="empty-state roomy">No booking has enabled arrival tracking.</div>}
      </div>
    </div>

    <div className="table-panel">
      <div className="table-toolbar">
        <strong>Provider settlement ledger (Active fee: {serviceFeePercent}%)</strong>
        <span>Funds remain held until the booking is completed. <a href="/settings" className="text-link">Manage fee rate</a></span>
      </div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Provider</span><span>Gross</span><span>Platform fee</span><span>Net</span><span>Release</span></div>
        {data.earnings.map((earning) => {
          const priest = relation(earning.priest_profiles);
          const booking = relation(earning.bookings);
          const releasable = earning.status === "available" && booking?.status === "completed";
          return <div className="table-row payments-table" key={earning.id}>
            <span><strong>{priest?.display_name || "Purohit"}</strong><small>{booking?.pooja_name || earning.booking_id}</small></span>
            <span><strong>{money(earning.gross_paise)}</strong></span>
            <span><strong>{money(earning.platform_fee_paise)}</strong></span>
            <span><strong>{money(earning.net_paise)}</strong><StatusPill status={earning.status}/></span>
            <span>{releasable ? <form action={approveProviderRelease}><input type="hidden" name="earning_id" value={earning.id}/><button className="primary-button"><CheckCircle2 size={15}/>Queue release</button></form> : <small>{booking?.status === "completed" ? "Not eligible" : "Complete booking first"}</small>}</span>
          </div>;
        })}
        {!data.earnings.length && <div className="empty-state roomy">No provider earnings are on hold.</div>}
      </div>
    </div>

    <div className="table-panel">
      <div className="table-toolbar"><strong>Disputes and chargebacks</strong><span>Created automatically from signature-verified Cashfree events.</span></div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Dispute</span><span>Amount</span><span>Reason</span><span>Status</span><span>Opened</span></div>
        {data.disputes.map((dispute) => <div className="table-row payments-table" key={dispute.id}>
          <span><strong>{dispute.provider_dispute_id || dispute.event_type}</strong><small>{dispute.payment_order_id}</small></span>
          <span><strong>{dispute.amount_paise ? money(dispute.amount_paise) : "Not supplied"}</strong></span>
          <span><strong>{dispute.reason || "Provider did not supply a reason"}</strong></span>
          <span><StatusPill status={dispute.status}/></span>
          <span><strong>{date(dispute.opened_at)}</strong></span>
        </div>)}
        {!data.disputes.length && <div className="empty-state roomy">No disputes or chargebacks.</div>}
      </div>
    </div>

    <div className="table-panel">
      <div className="table-toolbar"><strong>Signed webhook activity</strong><span>Raw provider payloads remain server-side.</span></div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Event</span><span>Provider ID</span><span>Order record</span><span>Signature</span><span>Received</span></div>
        {data.events.map((event) => <div className="table-row payments-table" key={event.id}>
          <span><strong>{event.event_type}</strong></span>
          <span><strong>{event.provider_event_id || "Not supplied"}</strong></span>
          <span><strong>{event.payment_order_id || "Unmatched"}</strong></span>
          <span>{event.signature_valid ? <><ShieldCheck size={16}/><small>Verified</small></> : <><AlertTriangle size={16}/><small>Rejected</small></>}</span>
          <span><strong>{date(event.received_at)}</strong></span>
        </div>)}
        {!data.events.length && <div className="empty-state roomy"><ReceiptText size={22}/>No webhook events received yet.</div>}
      </div>
    </div>
  </>;
}
