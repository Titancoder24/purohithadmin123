import { CheckCircle2, Database, Globe2, KeyRound, Percent, Save } from "lucide-react";
import { updateServiceFee } from "@/app/actions/settings";
import { PageHeading } from "@/components/page-heading";
import { getPlatformSettings } from "@/lib/data";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [query, { serviceFeePercent }] = await Promise.all([searchParams, getPlatformSettings()]);
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured";

  return (
    <>
      <PageHeading
        eyebrow="Platform configuration"
        title="Environment and settings"
        description="Manage dynamic platform fees, commissions, and read-only production integration statuses."
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
            <input
              name="service_fee_percent"
              type="number"
              step="0.1"
              min="0"
              max="50"
              defaultValue={serviceFeePercent}
              required
              style={{
                height: "40px",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                padding: "0 12px",
                fontSize: "14px",
                fontFamily: "var(--font-geist-mono)",
                background: "#faf9f8",
              }}
            />
          </label>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "11px", lineHeight: 1.5 }}>
            This fee is dynamically deducted from purohit earnings upon booking settlement. Customers pay the ceremony price (e.g. ₹1,000), and the purohit receives the net amount after this fee (e.g. ₹900 at 10%). Changing this rate immediately applies to all future bookings.
          </p>
          <div>
            <button className="primary-button" type="submit">
              <Save size={15} /> Update service fee
            </button>
          </div>
        </form>
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
