import Link from "next/link";
import { ArrowUpRight, FilePlus2, SearchCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPages } from "@/lib/data";

export default async function PagesPage() {
  const pages = await getPages();
  return <><PageHeading eyebrow="Publishing desk" title="Search content" description="Create authoritative, locally relevant pages for search engines, answer engines, and families." actions={<Link href="/content/pages/new" className="primary-button"><FilePlus2 size={16}/>New page</Link>}/><div className="table-panel"><div className="table-toolbar"><span><SearchCheck size={17}/>{pages.length} managed pages</span><Link href="/seo" className="text-link">Keyword strategy <ArrowUpRight size={14}/></Link></div><div className="data-table"><div className="table-row table-head"><span>Page</span><span>Type</span><span>Status</span><span>30-day reach</span><span>Updated</span></div>{pages.map((page) => <Link href={`/content/pages/new?id=${page.id}`} className="table-row" key={page.id}><span><strong>{page.title}</strong><small>/{page.slug}</small></span><span>{page.page_type}</span><span><StatusPill status={page.status}/></span><span><strong>{page.impressions_30d || 0}</strong><small>{page.clicks_30d || 0} clicks · {page.conversions_30d || 0} conversions</small></span><span>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(page.updated_at))}</span></Link>)}{!pages.length && <div className="empty-state roomy">No pages yet. Create the first programmatic search page.</div>}</div></div></>;
}

