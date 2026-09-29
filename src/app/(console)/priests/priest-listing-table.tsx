"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, MapPin, Pencil, X } from "lucide-react";
import { reviewPriest, savePriestListing, setPriestListingVisibility } from "@/app/actions/content";
import { StatusPill } from "@/components/status-pill";
import type { getPeopleData } from "@/lib/data";
import { PriestPhotoUpload } from "./priest-photo-upload";
import { PriestGalleryUpload } from "./priest-gallery-upload";
import { LocationTagPicker } from "./location-tag-picker";
import styles from "./priest-listing-table.module.css";

type Priest = Awaited<ReturnType<typeof getPeopleData>>["priests"][number];
const publicBaseUrl = "https://prohit-connect-one.vercel.app";

export function PriestListingTable({ priests }: { priests: Priest[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = priests.length > 0 && selected.length === priests.length;

  function toggleSelected(id: string) {
    setSelected((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  }

  return <div className="provider-list">
    <div className={styles.toolbar}>
      <label><input type="checkbox" aria-label="Select all priests" disabled={!priests.length} checked={allSelected} onChange={() => setSelected(allSelected ? [] : priests.map((priest) => priest.id))}/> Select all ({priests.length})</label>
      <span>{selected.length} selected</span>
      <form action={setPriestListingVisibility} className={styles.bulkActions}>
        <input type="hidden" name="ids" value={JSON.stringify(selected)}/>
        <button className="secondary-button" name="visibility" value="hide" disabled={!selected.length}>Hide selected</button>
        <button className="secondary-button" name="visibility" value="show" disabled={!selected.length}>Show selected</button>
      </form>
    </div>
    {priests.map((priest) => {
      const publicReady = priest.is_listed && priest.verification_status === "verified" && priest.slug && priest.photo_url && priest.submitted_at;
      return <article className={`provider-row ${styles.row}`} key={priest.id}>
        <input className={styles.rowCheck} type="checkbox" aria-label={`Select ${priest.display_name}`} checked={selected.includes(priest.id)} onChange={() => toggleSelected(priest.id)}/>
        <div className="provider-avatar">{priest.photo_url ? <Image src={priest.photo_url} alt="" width={48} height={48}/> : priest.display_name?.slice(0, 2).toUpperCase()}</div>
        <div className="provider-main"><div><h2>{priest.display_name}</h2><StatusPill status={priest.verification_status}/>{!priest.is_listed && <span className={styles.hidden}>Hidden from marketplace</span>}</div><p><MapPin size={14}/>{priest.service_areas?.join(", ") || "Service area not supplied"}</p><small>{priest.pooja_slugs?.join(" · ") || "No specialties selected"}</small></div>
        <div className="provider-score"><strong>{Number(priest.rating).toFixed(1)}</strong><small>{priest.review_count} reviews</small></div>
        <div className="provider-actions">
          {publicReady && <a className="secondary-button" href={`${publicBaseUrl}/purohits/${priest.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Profile</a>}
          <details className="provider-editor"><summary className="secondary-button"><Pencil size={15}/>Edit</summary><form action={savePriestListing} className="editor-form"><input type="hidden" name="id" value={priest.id}/><div className="form-grid">
            <label>Name<input name="display_name" defaultValue={priest.display_name || ""} required/></label>
            <label>Headline<input name="profile_headline" defaultValue={priest.profile_headline || ""} placeholder="Vedic priest for home ceremonies"/></label>
            <label className="span-2">About<textarea name="bio" rows={4} defaultValue={priest.bio || ""}/></label>
            <PriestPhotoUpload initialUrl={priest.photo_url || ""} priestId={priest.id}/>
            <PriestGalleryUpload initialUrls={priest.portfolio_urls || []} priestId={priest.id}/>
            <LocationTagPicker initialAreas={priest.service_areas || []} initialPrimary={priest.primary_service_area || ""}/>
            <label>Languages, comma separated<input name="languages" defaultValue={(priest.languages || []).join(", ")} placeholder="Kannada, Sanskrit"/></label>
            <label>Puja slugs, comma separated<input name="pooja_slugs" defaultValue={(priest.pooja_slugs || []).join(", ")} placeholder="rudrabhishek, griha-pravesh"/></label>
            <label>Starting price (INR)<input name="starting_price_inr" type="number" min="0" defaultValue={priest.starting_price_inr || 0}/></label>
            <label>Maximum price (INR)<input name="max_price_inr" type="number" min="0" defaultValue={priest.max_price_inr || priest.starting_price_inr || 0}/></label>
          </div><div className="form-actions"><button className="primary-button">Save marketplace profile</button></div></form></details>
          <form action={setPriestListingVisibility}><input type="hidden" name="ids" value={JSON.stringify([priest.id])}/><button className="secondary-button" name="visibility" value={priest.is_listed ? "hide" : "show"}>{priest.is_listed ? "Hide" : "Show"}</button></form>
          <form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="rejected"/><button className="secondary-button" title="Reject profile"><X size={16}/></button></form>
          <form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="verified"/><button className="primary-button" title="Verify profile"><Check size={16}/></button></form>
        </div>
      </article>;
    })}
    {!priests.length && <div className="empty-state roomy">No priest profiles found.</div>}
  </div>;
}
