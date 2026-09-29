"use client";

import { useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { savePriestGallery } from "@/app/actions/content";
import { createClient } from "@/lib/supabase/client";
import styles from "./priest-gallery-upload.module.css";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGES = 30;

export function PriestGalleryUpload({ initialUrls = [], priestId }: { initialUrls?: string[]; priestId?: string }) {
  const [urls, setUrls] = useState(initialUrls.slice(0, MAX_IMAGES));
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");

  async function persist(next: string[]) {
    if (!priestId) return;
    const result = await savePriestGallery(priestId, next);
    if (result.error) throw new Error(result.error);
  }

  async function upload(files: File[]) {
    if (!files.length || busy) return;
    const room = MAX_IMAGES - urls.length;
    if (room <= 0) { setMessage(`A profile can contain up to ${MAX_IMAGES} gallery photos.`); return; }
    const selected = files.slice(0, room);
    const invalid = selected.find((file) => !TYPES[file.type] || file.size > 5 * 1024 * 1024);
    if (invalid) { setMessage(`${invalid.name}: use JPG, PNG, or WebP under 5 MB.`); return; }
    setBusy(true); setMessage(`Uploading ${selected.length} photo${selected.length === 1 ? "" : "s"}…`);
    try {
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const file of selected) {
        const path = `${priestId || "new"}/gallery/${crypto.randomUUID()}.${TYPES[file.type]}`;
        const { error } = await supabase.storage.from("priest-images").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploaded.push(supabase.storage.from("priest-images").getPublicUrl(path).data.publicUrl);
      }
      const next = [...urls, ...uploaded];
      await persist(next);
      setUrls(next); setMessage(`${uploaded.length} gallery photo${uploaded.length === 1 ? "" : "s"} saved.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Gallery upload failed."); }
    finally { setBusy(false); }
  }

  async function remove(url: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    const next = urls.filter((item) => item !== url);
    try { await persist(next); setUrls(next); setMessage("Gallery updated."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not update gallery."); }
    finally { setBusy(false); }
  }

  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }

  return <div className={`span-2 ${styles.gallery}`}>
    <textarea name="portfolio_urls" value={urls.join("\n")} readOnly hidden/>
    <label className={`${styles.drop} ${dragging ? styles.dragging : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <ImagePlus size={19}/><span><strong>Ceremony gallery</strong><small>Drop or choose multiple photos. Up to {MAX_IMAGES} JPG, PNG, or WebP images, 5 MB each.</small></span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(Array.from(event.target.files || [])); event.target.value = ""; }}/>
    </label>
    {!!urls.length && <div className={styles.grid}>{urls.map((url, index) => <figure key={url}><Image src={url} alt={`Ceremony gallery ${index + 1}`} width={160} height={112} unoptimized/><button type="button" onClick={() => void remove(url)} aria-label={`Remove gallery photo ${index + 1}`}><Trash2 size={14}/></button></figure>)}</div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
