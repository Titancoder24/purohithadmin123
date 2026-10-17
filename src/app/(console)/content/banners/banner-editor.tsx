"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, RotateCcw, Save, Sparkles } from "lucide-react";
import { saveRolePickerBanner } from "@/app/actions/banner";
import { BANNER_BUCKET, BANNER_LIMITS, type RolePickerBanner } from "@/lib/banner";
import { createClient } from "@/lib/supabase/client";
import styles from "./banner-editor.module.css";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function BannerEditor({ initial, updatedAt }: { initial: RolePickerBanner; updatedAt: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [badge, setBadge] = useState(initial.badge);
  const [title, setTitle] = useState(initial.title);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(file?: File) {
    if (!file || uploading) return;
    setUploadError("");
    const extension = IMAGE_TYPES[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      setUploadError("Choose a JPG, PNG, or WebP image under 5 MB. A wide image (about 1600 × 1000) works best.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `role-picker/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(BANNER_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setImageUrl(supabase.storage.from(BANNER_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files?.[0]);
  }

  const previewImage = imageUrl || "/role-picker-default.png";

  return <div className={styles.layout}>
    <form action={saveRolePickerBanner} className={`editor-form ${styles.form}`}>
      <label>
        Badge text <span className={styles.count}>{badge.length}/{BANNER_LIMITS.badge}</span>
        <input name="badge" value={badge} maxLength={BANNER_LIMITS.badge} onChange={(event) => setBadge(event.target.value)} required />
      </label>
      <label>
        Headline <span className={styles.count}>{title.length}/{BANNER_LIMITS.title}</span>
        <textarea name="title" rows={3} value={title} maxLength={BANNER_LIMITS.title} onChange={(event) => setTitle(event.target.value)} required />
        <small className={styles.help}>Press Enter for a line break. Short, two-line headlines read best on phones.</small>
      </label>

      <div className={styles.imageField}>
        <span className={styles.fieldLabel}>Banner image</span>
        <label
          className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={22} />
          <span className={styles.copy}>
            <strong>{uploading ? "Uploading…" : imageUrl ? "Replace the image" : "Upload a banner image"}</strong>
            <small>JPG, PNG, or WebP up to 5 MB. Text sits on the bottom-left, so keep the subject clear of that area.</small>
          </span>
          <input ref={inputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} />
        </label>
        {imageUrl ? <button type="button" className={styles.linkButton} onClick={() => setImageUrl("")}>Use the built-in image instead</button> : <small className={styles.help}>Using the built-in temple image.</small>}
        {uploadError && <p className={styles.error} role="alert">{uploadError}</p>}
      </div>
      <input type="hidden" name="image_url" value={imageUrl} />

      <div className="form-actions">
        <button type="submit" name="reset" value="1" className="secondary-button" disabled={uploading}><RotateCcw size={15} />Reset to default</button>
        <button type="submit" className="primary-button" disabled={uploading}><Save size={15} />Publish banner</button>
      </div>
      {updatedAt && <small className={styles.help}>Last published {new Date(updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small>}
    </form>

    <div className={styles.previewColumn}>
      <span className={styles.fieldLabel}>Live preview</span>
      <div className={styles.phone}>
        <div className={styles.hero} style={{ backgroundImage: `url("${previewImage}")` }}>
          <div className={styles.shade} />
          <div className={styles.heroCopy}>
            <span className={styles.badge}><Sparkles size={12} />{badge || " "}</span>
            <h3 className={styles.title}>{title || " "}</h3>
          </div>
        </div>
        <div className={styles.fakeButton}>Book a ceremony</div>
        <div className={`${styles.fakeButton} ${styles.fakeButtonLight}`}>I am a purohit</div>
      </div>
    </div>
  </div>;
}
