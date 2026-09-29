"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePooja } from "@/app/actions/content";
import type { Pooja } from "@/lib/types";

const IMAGE_BUCKET = "pooja-images";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function PoojaForm({ pooja }: { pooja?: Pooja }) {
  const [imageUrl, setImageUrl] = useState(pooja?.image_url || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploadError("");
    const extension = IMAGE_TYPES[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      setUploadError("Choose a JPG, PNG, or WebP image under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${pooja?.id || "new"}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setImageUrl(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return <form action={savePooja} className="editor-form">
    {pooja && <input type="hidden" name="id" value={pooja.id}/>}
    <div className="form-grid">
      <label>Service name<input name="name" defaultValue={pooja?.name} required/></label>
      <label>URL slug<input name="slug" defaultValue={pooja?.slug} required pattern="[a-z0-9-]+"/></label>
      <label>Kannada name<input name="kannada_name" defaultValue={pooja?.kannada_name}/></label>
      <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])}/></label>
      <label className="span-2">Image URL<input name="image_url" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Upload an image or enter a URL"/></label>
      {uploading && <p className="form-hint span-2" role="status">Uploading image…</p>}
      {uploadError && <p className="form-hint span-2" role="alert">{uploadError}</p>}
      <label>Duration (minutes)<input name="duration_minutes" type="number" min="15" defaultValue={pooja?.duration_minutes ?? 120} required/></label>
      <label>Starting price (INR)<input name="base_price_inr" type="number" min="0" defaultValue={pooja?.base_price_inr ?? 0} required/></label>
      <label className="span-2">Description<textarea name="description" rows={3} defaultValue={pooja?.description}/></label>
      <label>SEO title<input name="seo_title" defaultValue={pooja?.seo_title || ""}/></label>
      <label>SEO description<input name="seo_description" defaultValue={pooja?.seo_description || ""}/></label>
    </div>
    <label className="check-row"><input name="is_active" type="checkbox" defaultChecked={pooja?.is_active ?? true}/><span>Visible to customers and eligible priests</span></label>
    <div className="form-actions"><button className="primary-button" disabled={uploading}>{pooja ? "Save changes" : "Create puja"}</button></div>
  </form>;
}
