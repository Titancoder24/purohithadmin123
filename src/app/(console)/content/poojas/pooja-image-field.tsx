"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./pooja-image-field.module.css";

const IMAGE_BUCKET = "pooja-images";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function PoojaImageField({
  poojaId,
  initialUrl = "",
  onBusyChange,
}: {
  poojaId?: string;
  initialUrl?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [onBusyChange, uploading]);

  async function uploadImage(file?: File) {
    if (!file || uploading) return;
    setUploadError("");
    const extension = IMAGE_TYPES[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      setUploadError("Choose a JPG, PNG, or WebP image under 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${poojaId || "new"}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setImageUrl(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview("");
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (event.dataTransfer.files.length !== 1) {
      setUploadError("Drop one image at a time.");
      return;
    }
    void uploadImage(file);
  }

  const shown = preview || imageUrl;

  return <div className={`${styles.field} span-2`}>
    <div className={styles.layout}>
      <div className={styles.preview}>
        {shown ? (
          // Blob previews and pasted URLs sit outside the Next image allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" />
        ) : <span>Photo</span>}
        {uploading && <span className={styles.overlay}>Uploading…</span>}
      </div>
      <label
        className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <ImagePlus size={22} />
        <span className={styles.copy}>
          <strong>{imageUrl ? "Replace this photo" : "Add a product photo"}</strong>
          <small>Drop a JPG, PNG, or WebP here, or browse. Up to 5 MB. The new photo is saved when you save the puja.</small>
        </span>
        <span className={styles.browse}>{uploading ? "Uploading" : "Browse"}</span>
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => void uploadImage(event.target.files?.[0])}
        />
      </label>
    </div>
    <input type="hidden" name="image_url" value={imageUrl} />
    <details className={styles.urlDisclosure}>
      <summary>Paste an image URL instead</summary>
      <label>
        Image URL
        <input
          type="url"
          form="pooja-image-url-draft"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://"
        />
      </label>
    </details>
    {imageUrl && !uploading && <button type="button" className={styles.remove} onClick={() => setImageUrl("")}>Remove photo</button>}
    {uploading && <p className={styles.hint} role="status">Uploading image…</p>}
    {uploadError && <p className={`${styles.hint} ${styles.error}`} role="alert">{uploadError}</p>}
  </div>;
}
