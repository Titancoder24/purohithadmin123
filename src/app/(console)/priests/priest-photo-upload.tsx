"use client";

import { useState, type DragEvent } from "react";
import Image from "next/image";
import { Images } from "lucide-react";
import { savePriestPhoto } from "@/app/actions/content";
import { createClient } from "@/lib/supabase/client";
import styles from "./priest-photo-upload.module.css";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function PriestPhotoUpload({ initialUrl = "", priestId }: { initialUrl?: string; priestId?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file?: File) {
    if (!file || busy) return;
    setError("");
    setStatus("");
    const extension = TYPES[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP image under 5 MB.");
      return;
    }
    setBusy(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    try {
      const supabase = createClient();
      const path = `${priestId || "new"}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("priest-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("priest-images").getPublicUrl(path).data.publicUrl;
      if (priestId) {
        const result = await savePriestPhoto(priestId, publicUrl);
        if (result.error) throw new Error(result.error);
      }
      setUrl(publicUrl);
      setStatus(priestId ? "Profile photo saved." : "Photo uploaded. Create the priest account to save the profile.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview("");
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Drop one JPG, PNG, or WebP photo at a time.");
      return;
    }
    void upload(event.dataTransfer.files[0]);
  }

  return <div className="span-2">
    <input name="photo_url" type="hidden" value={url}/>
    <label className={`${styles.dropZone} ${dragging ? styles.dragging : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <Images size={19}/><span><strong>Profile photo</strong><small>Drop a JPG, PNG, or WebP photo here, or choose a file (up to 5 MB).</small></span>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }}/>
    </label>
    {(preview || url) && <Image src={preview || url} alt="Priest profile preview" width={88} height={88} unoptimized className={styles.preview}/>}
    {busy && <p className="form-hint" role="status">Uploading photo…</p>}
    {status && <p className="form-hint" role="status">{status}</p>}
    {error && <p className="form-hint" role="alert">{error}</p>}
  </div>;
}
