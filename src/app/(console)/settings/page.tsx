import { CheckCircle2, Database, Globe2, KeyRound, Save } from "lucide-react";
import { updateBiddingMode, updateServiceFee } from "@/app/actions/settings";
import { AppearanceEditor } from "./appearance-editor";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_APPEARANCE } from "@/lib/appearance";
import { getAdminConsoleTheme, getPlatformSettings } from "@/lib/data";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const [query, { serviceFeePercent, biddingEnabled }, savedTheme] = await Promise.all([searchParams, getPlatformSettings(), getAdminConsoleTheme(admin.id)]);
  const consoleAppearance = savedTheme || DEFAULT_APPEARANCE;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured";

  return (
    <>
      <PageHeading
        eyebrow="Platform configuration"
        title="Environment and settings"
        description="Set the look of this console for your account, manage platform fees, and review production integration status. Customer app themes stay on each phone."
      />

      {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
      {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}

      <section className="panel" style={{ marginBottom: "22px" }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow" style={{ color: "var(--orange)", fontWeight: 700, margin: 0, fontSize: "11px" }}>Payment operations</p>
            <h2>Payment Service Charge & Commission</h2>
          </div>
          <span className="healthy" style={{ fontSize: "12px" }}>
            <CheckCircle2 size={16} /> Active rate: {serviceFeePercent}%
          </span>
        </div>

        <form action={updateServiceFee} style={{ display: "grid", gap: "16px", maxWidth: "480px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
            Platform service fee percentage (%)
            <select
              name="service_fee_percent"
              defaultValue={serviceFeePercent}
              style={{
                height: "40px",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                padding: "0 12px",
                fontSize: "14px",
                fontFamily: "var(--font-geist-mono)",
                background: "#faf9f8",
              }}
            ><option value="5">5%</option><option value="10">10%</option></select>
          </label>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "11px", lineHeight: 1.5 }}>
            The platform fee is added to the priest&apos;s published price on new bookings. For a ₹5,000 pooja at 10%, the customer pays ₹5,500. Existing bookings retain their original total.
          </p>
          <div>
            <button className="primary-button" type="submit">
              <Save size={15} /> Update service fee
            </button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: "22px" }}>
        <div className="panel-heading"><div><p className="eyebrow">Booking method</p><h2>Customer bidding and proposals</h2></div></div>
        <p style={{ color: "var(--muted)", fontSize: "12px" }}>Fixed price shows each priest&apos;s published rate. Enable bidding only when you want customers to request and compare proposals.</p>
        <form action={updateBiddingMode} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select name="bidding_enabled" defaultValue={String(biddingEnabled)} disabled={admin.role !== "super_admin"} aria-label="Customer bidding mode">
            <option value="false">Fixed price only</option><option value="true">Allow proposals</option>
          </select>
          <button className="primary-button" disabled={admin.role !== "super_admin"}>Save booking method</button>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: "22px" }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow" style={{ color: "var(--orange)", fontWeight: 700, margin: 0, fontSize: "11px" }}>This console</p>
            <h2>Your theme and button style</h2>
          </div>
        </div>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "12px", lineHeight: 1.5, maxWidth: "680px" }}>
          This changes the colors and buttons in the admin web app for your account. It does not change the customer or purohit apps. Those themes are chosen on each phone.
        </p>
        <AppearanceEditor initial={consoleAppearance} />
      </section>

      <section className="settings-grid">
        <article className="panel setting-card">
          <Database />
          <div>
            <h2>Supabase project</h2>
            <p>{projectUrl}</p>
            <span className="healthy">
              <CheckCircle2 size={15} /> Expected project: fvvmfrbfqwdypkagtdce
            </span>
          </div>
        </article>
        <article className="panel setting-card">
          <KeyRound />
          <div>
            <h2>Authentication</h2>
            <p>Cookie-based SSR sessions with database role verification.</p>
            <span className="healthy">
              <CheckCircle2 size={15} /> RLS enforced
            </span>
          </div>
        </article>
        <article className="panel setting-card">
          <Globe2 />
          <div>
            <h2>Public publishing</h2>
            <p>Only `published` programmatic pages are readable anonymously.</p>
            <span className="healthy">
              <CheckCircle2 size={15} /> Draft isolation enabled
            </span>
          </div>
        </article>
      </section>

      <section className="panel deployment-checklist">
        <h2>Production checklist</h2>
        {[
          "Set the Supabase publishable key in Vercel",
          "Apply all migrations to the dedicated project",
          "Create the first Auth user and promote its app_users role to super_admin",
          "Configure the public site URL and auth redirect allowlist",
          "Connect Search Console ingestion to content_performance_daily",
        ].map((item, index) => (
          <div key={item}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </section>
    </>
  );
}
