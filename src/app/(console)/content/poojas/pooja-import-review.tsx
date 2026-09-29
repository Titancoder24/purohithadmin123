"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import Image from "next/image";
import { Download, FileUp, Images, Trash2 } from "lucide-react";
import { read, utils } from "xlsx";
import { bulkImportPoojas } from "@/app/actions/content";
import { createClient } from "@/lib/supabase/client";
import styles from "./pooja-import-review.module.css";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  kannada_name: string;
  description: string;
  duration_minutes: string;
  base_price_inr: string;
  image_url: string;
  seo_title: string;
  seo_description: string;
  is_active: boolean;
};

const columns = ["slug", "name", "duration_minutes", "base_price_inr"];
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const cell = (row: Record<string, unknown>, key: string) => String(row[key] ?? "").trim();
const imageKey = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\.(jpe?g|png|webp)$/i, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

export function PoojaImportReview() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function loadFile(file?: File) {
    setRows([]);
    setSource("");
    setError("");
    setBulkStatus("");
    if (!file) return;
    if (!/\.(csv|xlsx|xlsb)$/i.test(file.name) || file.size > 2_000_000) {
      setError("Choose a CSV, XLSX, or XLSB file under 2 MB.");
      return;
    }
    try {
      // SheetJS treats raw CSV bytes as Latin-1; decode UTF-8 first for Kannada names.
      const workbook = file.name.toLowerCase().endsWith(".csv")
        ? read(await file.text(), { type: "string" })
        : read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook has no sheets.");
      const header = (utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false })[0] as unknown[] | undefined)?.map((value) => String(value ?? "").trim().replace(/^\uFEFF/, "")) || [];
      const missing = columns.filter((column) => !header.includes(column));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
      const data = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false, blankrows: false });
      if (!data.length || data.length > 100) throw new Error("Import between 1 and 100 products.");
      setRows(data.map((row) => ({
        id: crypto.randomUUID(),
        slug: cell(row, "slug"),
        name: cell(row, "name"),
        kannada_name: cell(row, "kannada_name"),
        description: cell(row, "description"),
        duration_minutes: cell(row, "duration_minutes"),
        base_price_inr: cell(row, "base_price_inr"),
        image_url: cell(row, "image_url"),
        seo_title: cell(row, "seo_title"),
        seo_description: cell(row, "seo_description"),
        is_active: !["false", "0", "no", "inactive"].includes(cell(row, "is_active").toLowerCase()),
      })));
      setSource(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the product file.");
    }
  }

  function update(id: string, patch: Partial<ProductRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function storeImage(file: File) {
    const extension = imageTypes[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name}: choose a JPG, PNG, or WebP image under 5 MB.`);
    }
    const supabase = createClient();
    const path = `imports/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("pooja-images").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from("pooja-images").getPublicUrl(path).data.publicUrl;
  }

  async function uploadImage(id: string, file?: File) {
    if (!file || busyRow || bulkBusy || submitting) return;
    setError("");
    setBusyRow(id);
    const preview = URL.createObjectURL(file);
    setPreviews((current) => ({ ...current, [id]: preview }));
    try {
      update(id, { image_url: await storeImage(file) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      URL.revokeObjectURL(preview);
      setPreviews((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setBusyRow(null);
    }
  }

  async function uploadBulkImages(files: File[]) {
    if (!files.length || bulkBusy || busyRow || submitting) return;
    setError("");
    setBulkStatus("");
    if (!rows.length) {
      setError("Load a product CSV or Excel file before adding images.");
      return;
    }
    if (files.length > 100) {
      setError("Choose no more than 100 images at a time.");
      return;
    }
    const byKey = new Map<string, ProductRow>();
    for (const row of rows) {
      byKey.set(imageKey(row.slug), row);
      if (row.name) byKey.set(imageKey(row.name), row);
    }
    const matched: { row: ProductRow; file: File }[] = [];
    const unmatched: string[] = [];
    const used = new Set<string>();
    for (const file of files) {
      const row = byKey.get(imageKey(file.name));
      if (!row || used.has(row.id)) {
        unmatched.push(file.name);
        continue;
      }
      used.add(row.id);
      matched.push({ row, file });
    }
    if (!matched.length) {
      setError(`No images matched product slugs or names. Rename files to match a slug, for example ${rows[0].slug}.jpg.`);
      return;
    }
    setBulkBusy(true);
    const failures: string[] = [];
    let uploaded = 0;
    for (const { row, file } of matched) {
      const preview = URL.createObjectURL(file);
      setPreviews((current) => ({ ...current, [row.id]: preview }));
      try {
        update(row.id, { image_url: await storeImage(file) });
        uploaded++;
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : "upload failed"}`);
      } finally {
        URL.revokeObjectURL(preview);
        setPreviews((current) => {
          const next = { ...current };
          delete next[row.id];
          return next;
        });
      }
    }
    setBulkBusy(false);
    setBulkStatus(`${uploaded} image${uploaded === 1 ? "" : "s"} attached to the review table.${unmatched.length ? ` ${unmatched.length} unmatched: ${unmatched.join(", ")}.` : ""}`);
    if (failures.length) setError(`Failed uploads: ${failures.join("; ")}`);
  }

  function dropRow(event: DragEvent<HTMLElement>, id: string) {
    event.preventDefault();
    event.stopPropagation();
    setDragTarget(null);
    if (event.dataTransfer.files.length !== 1) {
      setError("Drop one image on a product row. Use Bulk images for multiple files.");
      return;
    }
    void uploadImage(id, event.dataTransfer.files[0]);
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    if (busyRow || bulkBusy || !rows.length) {
      event.preventDefault();
      return;
    }
    setError("");
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      if (seen.has(row.slug)) {
        event.preventDefault();
        setError(`Row ${index + 1}: duplicate slug ${row.slug}.`);
        return;
      }
      seen.add(row.slug);
      if (row.image_url) {
        try {
          if (new URL(row.image_url).protocol !== "https:") throw new Error();
        } catch {
          event.preventDefault();
          setError(`Row ${index + 1}: image URL must use HTTPS.`);
          return;
        }
      }
    }
    setSubmitting(true);
  }

  const reviewedRows = JSON.stringify(rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    kannada_name: row.kannada_name,
    description: row.description,
    duration_minutes: row.duration_minutes,
    base_price_inr: row.base_price_inr,
    image_url: row.image_url,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    is_active: row.is_active,
  })));

  return <div className={styles.review}>
    <div className={styles.toolbar}>
      <label className={styles.fileLabel}>Product CSV or Excel
        <input type="file" accept=".csv,.xlsx,.xlsb,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void loadFile(event.target.files?.[0])}/>
      </label>
      <a className="secondary-button" href="/templates/pooja-products.csv" download><Download size={16}/>CSV template</a>
      <a className="secondary-button" href="/templates/pooja-products.xlsx" download><Download size={16}/>Excel template</a>
    </div>
    <p className={styles.hint}>Review up to 100 products before import. Edit any field, replace an image in its row, or match multiple images by filename. Existing slugs are updated. Active products appear in the customer app.</p>
    {!!rows.length && <label className={`${styles.bulkDrop} ${dragTarget === "bulk" ? styles.dragging : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragTarget("bulk"); }}
      onDragLeave={() => setDragTarget(null)}
      onDrop={(event) => { event.preventDefault(); setDragTarget(null); void uploadBulkImages(Array.from(event.dataTransfer.files)); }}>
      <Images size={18}/><span><strong>Bulk images</strong> · Drop images here or choose files. Name each file after its product slug, such as ganesh-pooja.jpg.</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Bulk product images" disabled={!!busyRow || bulkBusy || submitting} onChange={(event) => { void uploadBulkImages(Array.from(event.target.files || [])); event.target.value = ""; }}/>
    </label>}
    {bulkStatus && <p className={styles.status} role="status">{bulkStatus}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {!!rows.length && <form action={bulkImportPoojas} onSubmit={validate}>
      <input type="hidden" name="rows_json" value={reviewedRows}/>
      <div className={styles.summary}><strong>{rows.length} products ready to review</strong><span>{source}</span></div>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Image</th><th>Slug *</th><th>Name *</th><th>Kannada name</th><th>Description</th><th>Minutes *</th><th>Price ₹ *</th><th>SEO title</th><th>SEO description</th><th>Active</th><th></th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.id}>
            <td>{index + 1}</td>
            <td className={`${styles.imageCell} ${dragTarget === row.id ? styles.dragging : ""}`}
              onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setDragTarget(row.id); }}
              onDragLeave={() => setDragTarget(null)} onDrop={(event) => dropRow(event, row.id)}>
              {(previews[row.id] || row.image_url) && <Image src={previews[row.id] || row.image_url} alt={`${row.name || "Product"} preview`} width={56} height={56} unoptimized/>}
              <span className={styles.dropHint}>Drop image to replace</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Image for product ${index + 1}`} onChange={(event) => { void uploadImage(row.id, event.target.files?.[0]); event.target.value = ""; }} disabled={!!busyRow || bulkBusy || submitting}/>
              <input type="url" value={row.image_url} placeholder="Or HTTPS image URL" aria-label={`Image URL for product ${index + 1}`} onChange={(event) => update(row.id, { image_url: event.target.value })}/>
              {busyRow === row.id && <small role="status">Uploading…</small>}
            </td>
            <td><input value={row.slug} required pattern="[a-z0-9-]+" aria-label={`Slug for product ${index + 1}`} onChange={(event) => update(row.id, { slug: event.target.value })}/></td>
            <td><input value={row.name} required aria-label={`Name for product ${index + 1}`} onChange={(event) => update(row.id, { name: event.target.value })}/></td>
            <td><input value={row.kannada_name} aria-label={`Kannada name for product ${index + 1}`} onChange={(event) => update(row.id, { kannada_name: event.target.value })}/></td>
            <td><textarea value={row.description} rows={2} aria-label={`Description for product ${index + 1}`} onChange={(event) => update(row.id, { description: event.target.value })}/></td>
            <td><input type="number" min="15" step="1" value={row.duration_minutes} required aria-label={`Duration for product ${index + 1}`} onChange={(event) => update(row.id, { duration_minutes: event.target.value })}/></td>
            <td><input type="number" min="0" step="any" value={row.base_price_inr} required aria-label={`Price for product ${index + 1}`} onChange={(event) => update(row.id, { base_price_inr: event.target.value })}/></td>
            <td><input value={row.seo_title} aria-label={`SEO title for product ${index + 1}`} onChange={(event) => update(row.id, { seo_title: event.target.value })}/></td>
            <td><textarea value={row.seo_description} rows={2} aria-label={`SEO description for product ${index + 1}`} onChange={(event) => update(row.id, { seo_description: event.target.value })}/></td>
            <td><input type="checkbox" checked={row.is_active} aria-label={`Active product ${index + 1}`} onChange={(event) => update(row.id, { is_active: event.target.checked })}/></td>
            <td><button type="button" className="icon-button" aria-label={`Remove product ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 size={16}/></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className={styles.footer}><span>Image changes become public when you import. Only active products are shown to customers.</span><button className="primary-button" disabled={!!busyRow || bulkBusy || submitting}><FileUp size={16}/>{submitting ? "Importing…" : `Import ${rows.length} products`}</button></div>
    </form>}
  </div>;
}
