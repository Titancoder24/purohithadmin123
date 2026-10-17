import { CirclePlus, FileUp } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Toast } from "@/components/toast";
import { getPoojas } from "@/lib/data";
import { PoojaForm } from "./pooja-form";
import { PoojaImportReview } from "./pooja-import-review";
import { PoojaCatalogRow } from "./pooja-catalog-row";

export default async function PoojasPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [poojas, query] = await Promise.all([getPoojas(), searchParams]);
  return <>
    <PageHeading eyebrow="Content management" title="Puja catalog" description="The service taxonomy shared by customer requests, priest specialties, bidding, and search pages." />
    <details className="create-drawer" open={!poojas.length}>
      <summary><CirclePlus size={18} />Add a new puja</summary>
      <PoojaForm />
    </details>
    <details className="create-drawer">
      <summary><FileUp size={18} />Import products from CSV or Excel</summary>
      <PoojaImportReview />
    </details>
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    <Toast key={query.success || "empty"} message={query.success ? decodeURIComponent(query.success) : undefined} />
    <section className="catalog-list">
      {poojas.map((pooja) => <PoojaCatalogRow key={pooja.id} pooja={pooja} />)}
    </section>
  </>;
}
