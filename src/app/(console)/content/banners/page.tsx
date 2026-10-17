import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/auth";
import { ROLE_PICKER_BANNER_KEY, normalizeRolePickerBanner } from "@/lib/banner";
import { createClient } from "@/lib/supabase/server";
import { BannerEditor } from "./banner-editor";

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireAdmin();
  const [query, supabase] = await Promise.all([searchParams, createClient()]);
  const { data } = await supabase.from("platform_settings").select("value,updated_at").eq("key", ROLE_PICKER_BANNER_KEY).maybeSingle();
  let stored: unknown = null;
  try { stored = data?.value ? JSON.parse(data.value) : null; } catch { stored = null; }
  const banner = normalizeRolePickerBanner(stored);

  return <>
    <PageHeading
      eyebrow="App content"
      title="Welcome screen banner"
      description="Edit the banner people see on the first screen of the app, where they choose to continue as a customer or as a purohit."
    />
    {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    <section className="panel">
      <BannerEditor initial={banner} updatedAt={data?.updated_at || null} />
    </section>
  </>;
}
