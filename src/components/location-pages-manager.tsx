"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { BANGALORE_AREAS, LOCAL_PAGE_BASE_URL } from "@/data/bangalore-areas";

const zones = ["All zones", ...Array.from(new Set(BANGALORE_AREAS.map((area) => area.zone)))];

type PriestCoverage = { id: string; service_areas?: string[] | null; verification_status?: string | null };

export function LocationPagesManager({ priests }: { priests: PriestCoverage[] }) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("All zones");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return BANGALORE_AREAS.filter((area) =>
      (zone === "All zones" || area.zone === zone) && (!term || area.name.toLowerCase().includes(term)),
    );
  }, [query, zone]);
  const verifiedPriests = priests.filter((priest) => priest.verification_status === "verified");
  const providerCount = (areaName: string) => verifiedPriests.filter((priest) =>
    (priest.service_areas || []).some((item) => item.toLowerCase() === areaName.toLowerCase()),
  ).length;

  return <>
    <section className="location-page-kpis">
      <article><MapPin/><span><strong>{BANGALORE_AREAS.length}</strong><small>Published areas</small></span></article>
      <article><Search/><span><strong>{zones.length - 1}</strong><small>Coverage zones</small></span></article>
      <article><Sparkles/><span><strong>{verifiedPriests.length}</strong><small>Verified providers</small></span></article>
    </section>
    <section className="table-panel">
      <div className="location-toolbar">
        <label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an area" aria-label="Search location pages"/></label>
        <select value={zone} onChange={(event) => setZone(event.target.value)} aria-label="Filter by Bangalore zone">
          {zones.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span>{filtered.length} pages</span>
      </div>
      <div className="data-table">
        <div className="table-row location-page-table table-head"><span>Location page</span><span>Zone</span><span>Providers</span><span>Status</span><span>Preview</span></div>
        {filtered.map((area) => <div className="table-row location-page-table" key={area.slug}>
          <span><strong>Purohit near me in {area.name}</strong><small>/purohit-near-me/{area.slug}</small></span>
          <span>{area.zone}</span>
          <span><strong>{providerCount(area.name)}</strong><small>verified listings</small></span>
          <span><i className="publication-dot"/>Published</span>
          <span><a className="secondary-button compact-button" href={`${LOCAL_PAGE_BASE_URL}/${area.slug}`} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a></span>
        </div>)}
      </div>
    </section>
  </>;
}
