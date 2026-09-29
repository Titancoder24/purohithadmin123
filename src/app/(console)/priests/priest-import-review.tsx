"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import Image from "next/image";
import { Download, FileUp, Images, Trash2 } from "lucide-react";
import { read, utils } from "xlsx";
import { bulkOnboardPriests } from "@/app/actions/content";
import { createClient } from "@/lib/supabase/client";
import styles from "./priest-import-review.module.css";

type PriestRow = {
  id: string; full_name: string; email: string; phone: string; profile_headline: string; bio: string;
  years_experience: string; service_areas: string; primary_service_area: string; languages: string;
  pooja_slugs: string; starting_price_inr: string; max_price_inr: string; photo_url: string;
  portfolio_urls: string; verification_status: string;
};
const required = ["full_name", "phone", "profile_headline", "bio", "service_areas", "languages", "pooja_slugs", "starting_price_inr", "max_price_inr", "verification_status"];
const fields: { key: keyof PriestRow; label: string; required?: boolean; width?: number }[] = [
  { key: "full_name", label: "Full name", required: true }, { key: "email", label: "Email" },
  { key: "phone", label: "Phone", required: true }, { key: "profile_headline", label: "Headline", required: true },
  { key: "bio", label: "About", required: true, width: 220 }, { key: "years_experience", label: "Years" },
  { key: "service_areas", label: "Areas | separated", required: true }, { key: "primary_service_area", label: "Primary area" },
  { key: "languages", label: "Languages | separated", required: true }, { key: "pooja_slugs", label: "Puja slugs | separated", required: true },
  { key: "starting_price_inr", label: "Starting ₹", required: true }, { key: "max_price_inr", label: "Maximum ₹", required: true },
];
const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const keyFor = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\.(jpe?g|png|webp)$/i, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

export function PriestImportReview() {
  const [rows, setRows] = useState<PriestRow[]>([]);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  async function load(file?: File) {
    setRows([]); setSource(""); setError(""); setStatus("");
    if (!file) return;
    if (!/\.(csv|xlsx|xlsb)$/i.test(file.name) || file.size > 2_000_000) {
      setError("Choose a CSV, XLSX, or XLSB roster under 2 MB."); return;
    }
    try {
      const workbook = file.name.toLowerCase().endsWith(".csv")
        ? read(await file.text(), { type: "string" })
        : read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook has no sheets.");
      const cells = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: false });
      const headings = (cells[0] || []).map((value) => String(value ?? "").trim().replace(/^\uFEFF/, ""));
      if (new Set(headings).size !== headings.length) throw new Error("Duplicate column headings in roster.");
      const missing = required.filter((name) => !headings.includes(name));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
      const records = cells.slice(1).filter((line) => line.some((value) => String(value ?? "").trim())).map((line) =>
        Object.fromEntries(headings.map((heading, index) => [heading, String(line[index] ?? "").trim()])));
      if (!records.length || records.length > 250) throw new Error("Import between 1 and 250 priests.");
      setRows(records.map((record) => Object.fromEntries([
        ["id", crypto.randomUUID()],
        ...[...fields.map((field) => field.key), "photo_url", "portfolio_urls", "verification_status"].map((field) => [field, String(record[field] ?? "").trim()]),
      ]) as PriestRow));
      setSource(file.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read roster."); }
  }

  function update(id: string, patch: Partial<PriestRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function upload(id: string, file: File) {
    const extension = types[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: use a JPG, PNG, or WebP image under 5 MB.`);
    const preview = URL.createObjectURL(file);
    setPreviews((current) => ({ ...current, [id]: preview }));
    try {
      const supabase = createClient();
      const path = `imports/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("priest-images").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      update(id, { photo_url: supabase.storage.from("priest-images").getPublicUrl(path).data.publicUrl });
    } finally {
      URL.revokeObjectURL(preview);
      setPreviews((current) => { const next = { ...current }; delete next[id]; return next; });
    }
  }

  async function uploadOne(id: string, file?: File) {
    if (!file || busy || submitting) return;
    setBusy(true); setError(""); setStatus("");
    try { await upload(id, file); setStatus("Photo attached. Import the roster to publish the change."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Photo upload failed."); }
    finally { setBusy(false); }
  }

  async function uploadMany(files: File[]) {
    if (!files.length || busy || submitting) return;
    if (!rows.length) { setError("Load a roster before adding photos."); return; }
    if (files.length > 250) { setError("Choose up to 250 photos at once."); return; }
    setBusy(true); setError(""); setStatus("");
    const matches = new Map<string, PriestRow | null>();
    for (const row of rows) for (const value of [row.phone, row.phone.replace(/\D/g, ""), row.phone.replace(/\D/g, "").slice(-10), row.full_name, row.email, row.email.split("@")[0]]) {
      const key = keyFor(value);
      if (key) matches.set(key, matches.has(key) && matches.get(key)?.id !== row.id ? null : row);
    }
    let uploaded = 0;
    const unmatched: string[] = [];
    const failed: string[] = [];
    const used = new Set<string>();
    setStatus(`Matching and uploading ${files.length} photos…`);
    for (const file of files) {
      const row = matches.get(keyFor(file.name));
      if (!row || used.has(row.id)) { unmatched.push(file.name); continue; }
      used.add(row.id);
      try { await upload(row.id, file); uploaded++; setStatus(`${uploaded} of ${files.length} photos uploaded…`); }
      catch (cause) { failed.push(`${file.name}: ${cause instanceof Error ? cause.message : "upload failed"}`); }
    }
    setBusy(false);
    setStatus(`${uploaded} photo${uploaded === 1 ? "" : "s"} attached. Import the roster to publish.${unmatched.length ? ` Unmatched: ${unmatched.join(", ")}.` : ""}`);
    if (failed.length) setError(`Failed: ${failed.join("; ")}`);
  }

  function drop(event: DragEvent<HTMLElement>, id?: string) {
    event.preventDefault(); event.stopPropagation(); setDrag(null);
    const files = Array.from(event.dataTransfer.files);
    if (id) {
      if (files.length !== 1) { setError("Drop one photo on a priest row; use Bulk photos for multiple files."); return; }
      void uploadOne(id, files[0]);
    } else void uploadMany(files);
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    if (busy || !rows.length) { event.preventDefault(); return; }
    setError("");
    const phones = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const phone = row.phone.replace(/\D/g, "");
      if (phones.has(phone)) { event.preventDefault(); setError(`Row ${index + 1}: duplicate phone.`); return; }
      phones.add(phone);
      if (row.photo_url) {
        try { if (new URL(row.photo_url).protocol !== "https:") throw new Error(); }
        catch { event.preventDefault(); setError(`Row ${index + 1}: photo URL must use HTTPS.`); return; }
      }
    }
    setSubmitting(true);
  }

  return <div className={styles.review}>
    <div className={styles.toolbar}>
      <label>Priest roster CSV or Excel<input type="file" accept=".csv,.xlsx,.xlsb,text/csv" onChange={(event) => void load(event.target.files?.[0])}/></label>
      <a className="secondary-button" href="/templates/purohit-bulk-onboarding.csv" download><Download size={16}/>CSV template</a>
      <a className="secondary-button" href="/templates/purohit-bulk-onboarding.xlsx" download><Download size={16}/>Excel template</a>
    </div>
    <p className={styles.hint}>Review up to 250 priests before import. Edit fields and add photos now. Name bulk photos after the priest phone number, full name, or email. Separate areas, languages, and puja slugs with |.</p>
    {!!rows.length && <label className={`${styles.bulkDrop} ${drag === "bulk" ? styles.dragging : ""}`} onDragOver={(event) => { event.preventDefault(); setDrag("bulk"); }} onDragLeave={() => setDrag(null)} onDrop={(event) => drop(event)}>
      <Images size={18}/><span><strong>Bulk photos</strong> · Drop images or choose files, such as 9876543210.jpg</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Bulk priest photos" disabled={busy || submitting} onChange={(event) => { void uploadMany(Array.from(event.target.files || [])); event.target.value = ""; }}/>
    </label>}
    {status && <p className={styles.status} role="status">{status}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {!!rows.length && <form action={bulkOnboardPriests} onSubmit={validate}>
      <input type="hidden" name="rows_json" value={JSON.stringify(rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id"))))}/>
      <div className={styles.summary}><strong>{rows.length} priests ready to review</strong><span>{source}</span></div>
      <div className={styles.scroller}><table className={styles.table}><thead><tr><th>#</th><th>Photo</th>{fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Status</th><th></th></tr></thead><tbody>
        {rows.map((row, index) => <tr key={row.id}>
          <td>{index + 1}</td>
          <td className={`${styles.photoCell} ${drag === row.id ? styles.dragging : ""}`} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setDrag(row.id); }} onDragLeave={() => setDrag(null)} onDrop={(event) => drop(event, row.id)}>
            {(previews[row.id] || row.photo_url) && <Image src={previews[row.id] || row.photo_url} alt={`${row.full_name} preview`} width={64} height={64} unoptimized/>}
            <small>Drop photo to replace</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Photo for priest ${index + 1}`} disabled={busy || submitting} onChange={(event) => { void uploadOne(row.id, event.target.files?.[0]); event.target.value = ""; }}/>
            <input type="url" value={row.photo_url} placeholder="Or HTTPS photo URL" aria-label={`Photo URL for priest ${index + 1}`} onChange={(event) => update(row.id, { photo_url: event.target.value })}/>
          </td>
          {fields.map((field) => <td key={field.key}><input value={row[field.key]} required={field.required} style={{ width: field.width || 150 }} aria-label={`${field.label} for priest ${index + 1}`} onChange={(event) => update(row.id, { [field.key]: event.target.value })}/></td>)}
          <td><select value={row.verification_status} aria-label={`Status for priest ${index + 1}`} onChange={(event) => update(row.id, { verification_status: event.target.value })}><option value="pending">Pending</option><option value="verified">Verified</option></select></td>
          <td><button type="button" className="icon-button" aria-label={`Remove priest ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 size={16}/></button></td>
        </tr>)}
      </tbody></table></div>
      <div className={styles.footer}><span>Verified priests with photos can appear in the customer marketplace.</span><button className="primary-button" disabled={busy || submitting}><FileUp size={16}/>{submitting ? "Importing…" : `Import ${rows.length} priests`}</button></div>
    </form>}
  </div>;
}
