"use client";

import { useState } from "react";
import { savePooja } from "@/app/actions/content";
import type { Pooja } from "@/lib/types";
import { PoojaImageField } from "./pooja-image-field";

export function PoojaForm({ pooja, onCancel }: { pooja?: Pooja; onCancel?: () => void }) {
  const [uploading, setUploading] = useState(false);

  return <form action={savePooja} className="editor-form">
    {pooja && <input type="hidden" name="id" value={pooja.id} />}
    <div className="form-grid">
      <PoojaImageField poojaId={pooja?.id} initialUrl={pooja?.image_url || ""} onBusyChange={setUploading} />
      <label>Service name<input name="name" defaultValue={pooja?.name} required /></label>
      <label>URL slug<input name="slug" defaultValue={pooja?.slug} required pattern="[a-z0-9-]+" /></label>
      <label>Kannada name<input name="kannada_name" defaultValue={pooja?.kannada_name} /></label>
      <label>Duration (minutes)<input name="duration_minutes" type="number" min="15" defaultValue={pooja?.duration_minutes ?? 120} required /></label>
      <label>Starting price (INR)<input name="base_price_inr" type="number" min="0" defaultValue={pooja?.base_price_inr ?? 0} required /></label>
      <label className="span-2">Description<textarea name="description" rows={3} defaultValue={pooja?.description} /></label>
      <label>SEO title<input name="seo_title" defaultValue={pooja?.seo_title || ""} /></label>
      <label>SEO description<input name="seo_description" defaultValue={pooja?.seo_description || ""} /></label>
    </div>
    <label className="check-row"><input name="is_active" type="checkbox" defaultChecked={pooja?.is_active ?? true} /><span>Visible to customers and eligible priests</span></label>
    <div className="form-actions">
      {onCancel && <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>}
      <button className="primary-button" disabled={uploading}>{pooja ? "Save changes" : "Create puja"}</button>
    </div>
  </form>;
}
