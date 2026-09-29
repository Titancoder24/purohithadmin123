import { LocationPagesManager } from "@/components/location-pages-manager";
import { PageHeading } from "@/components/page-heading";
import { getPeopleData } from "@/lib/data";

export default async function LocationPagesPage() {
  const { priests } = await getPeopleData();
  return <>
    <PageHeading eyebrow="Programmatic discovery" title="Bangalore location pages" description="One governed template, published as 100 fast local pages with canonical metadata, FAQ and Service schema, internal links, sitemap coverage, and direct marketplace actions."/>
    <div className="principle-note"><p><strong>Publishing model</strong><span>The pages are regenerated from one reviewed dataset during every production build. No AI generation cost, no copy drift, and no accidental unpublished URLs.</span></p></div>
    <LocationPagesManager priests={priests}/>
  </>;
}
