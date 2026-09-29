import { CirclePlus, Clock3, FileUp, IndianRupee, Power } from "lucide-react";
import Image from "next/image";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPoojas } from "@/lib/data";
import { togglePooja } from "@/app/actions/content";
import { PoojaForm } from "./pooja-form";
import { PoojaImportReview } from "./pooja-import-review";

export default async function PoojasPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [poojas, query] = await Promise.all([getPoojas(), searchParams]);
  return <><PageHeading eyebrow="Content management" title="Puja catalog" description="The service taxonomy shared by customer requests, priest specialties, bidding, and search pages."/><details className="create-drawer" open={!poojas.length}><summary><CirclePlus size={18}/>Add a new puja</summary><PoojaForm/></details><details className="create-drawer"><summary><FileUp size={18}/>Import products from CSV or Excel</summary><PoojaImportReview/></details>{query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}{query.success && <div className="notice">{decodeURIComponent(query.success)}</div>}<section className="catalog-list">{poojas.map((pooja) => <article className="catalog-row" key={pooja.id}><div className="catalog-image">{pooja.image_url ? <Image src={pooja.image_url} alt="" width={72} height={72} unoptimized/> : <span>{pooja.name.slice(0, 2).toUpperCase()}</span>}</div><div className="catalog-copy"><div><h2>{pooja.name}</h2><StatusPill status={pooja.is_active ? "active" : "inactive"}/></div><p>{pooja.description || "No description has been added."}</p><span className="meta"><Clock3 size={15}/>{pooja.duration_minutes} min <IndianRupee size={15}/>{pooja.base_price_inr.toLocaleString("en-IN")}</span></div><details className="row-editor"><summary className="secondary-button">Edit</summary><div className="popover-editor"><PoojaForm pooja={pooja}/></div></details><form action={togglePooja}><input type="hidden" name="id" value={pooja.id}/><input type="hidden" name="next" value={String(!pooja.is_active)}/><button className="icon-button" title={pooja.is_active ? "Deactivate" : "Activate"}><Power size={17}/></button></form></article>)}</section></>;
}
