"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parse } from "csv-parse/sync";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const text = (form: FormData, key: string) => String(form.get(key) || "").trim();
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const pipeList = (value: unknown) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);

type PriestImportRow = {
  full_name: string;
  email?: string;
  login_username?: string;
  password?: string;
  phone?: string;
  profile_headline?: string;
  bio?: string;
  years_experience: number;
  service_areas: string[];
  primary_service_area?: string;
  languages: string[];
  pooja_slugs: string[];
  starting_price_inr: number;
  max_price_inr: number;
  photo_url?: string;
  portfolio_urls: string[];
  verification_status: "pending" | "verified";
};

async function runManagedPriestImport(priests: PriestImportRow[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    body: { action: "bulk_onboard_priests", priests },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = await error.context.json().catch(() => null);
      return { error: String(response?.error || error.message), data: null };
    }
    return { error: error.message, data: null };
  }
  if (data?.error) return { error: String(data.error), data: null };
  return { error: null, data };
}

async function audit(actorId: string, action: string, targetType: string, targetId: string, note = "") {
  const supabase = await createClient();
  await supabase.from("admin_actions").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, note });
}

export async function savePooja(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const id = text(formData, "id");
  const payload = {
    slug: text(formData, "slug"),
    name: text(formData, "name"),
    kannada_name: text(formData, "kannada_name"),
    description: text(formData, "description"),
    duration_minutes: Number(formData.get("duration_minutes") || 120),
    base_price_inr: Number(formData.get("base_price_inr") || 0),
    image_url: text(formData, "image_url") || null,
    seo_title: text(formData, "seo_title") || null,
    seo_description: text(formData, "seo_description") || null,
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };
  const query = id ? supabase.from("poojas").update(payload).eq("id", id) : supabase.from("poojas").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) redirect(`/content/poojas?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, id ? "update" : "create", "pooja", id || data?.id || payload.slug, payload.name);
  revalidatePath("/content/poojas");
  revalidatePath("/");
}

export async function bulkImportPoojas(formData: FormData) {
  const actor = await requireSuperAdmin();
  let records: Record<string, string>[];
  const reviewedRows = formData.get("rows_json");
  if (typeof reviewedRows === "string") {
    try {
      const parsed: unknown = JSON.parse(reviewedRows);
      if (!Array.isArray(parsed) || !parsed.length || parsed.length > 100) throw new Error("row count");
      records = parsed.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("row shape");
        return Object.fromEntries(Object.entries(row).map(([key, value]) => {
          if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new Error("cell value");
          return [key, String(value ?? "")];
        }));
      });
    } catch {
      redirect("/content/poojas?error=Invalid+product+review+table");
    }
  } else {
    const file = formData.get("csv_file");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000) {
      redirect("/content/poojas?error=Choose+a+CSV%2C+XLSX%2C+or+XLSB+file+under+1MB");
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xlsb"].includes(extension || "")) {
      redirect("/content/poojas?error=Use+a+CSV%2C+XLSX%2C+or+XLSB+file");
    }
    try {
      if (extension === "csv") {
        records = parse(await file.text(), {
          columns: (headers: string[]) => headers.map((header) => header.trim()),
          skip_empty_lines: true,
          trim: true,
          bom: true,
          skip_records_with_error: false,
        });
      } else {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error("empty workbook");
        const cells = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
        const headers = (cells.shift() || []).map((cell) => String(cell).trim());
        records = cells.filter((row) => row.some((cell) => String(cell).trim())).map((row) =>
          Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])),
        );
      }
    } catch {
      redirect("/content/poojas?error=Invalid+product+import+file");
    }
  }
  if (!records.length || records.length > 100) redirect("/content/poojas?error=Import+between+1+and+100+products");
  const required = ["slug", "name", "duration_minutes", "base_price_inr"];
  const missing = required.filter((column) => !(column in records[0]));
  if (missing.length) redirect(`/content/poojas?error=${encodeURIComponent(`Missing columns: ${missing.join(", ")}`)}`);

  const seen = new Set<string>();
  const rows = records.map((record, index) => {
    const row = index + 2;
    const slug = record.slug?.trim();
    const name = record.name?.trim();
    const duration = Number(record.duration_minutes);
    const price = Number(record.base_price_inr);
    const imageUrl = record.image_url?.trim() || "";
    const error = (message: string): never => redirect(`/content/poojas?error=${encodeURIComponent(`Row ${row}: ${message}`)}`);
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) error("slug must contain lowercase letters, digits, or hyphens");
    if (seen.has(slug)) error("duplicate slug in import");
    seen.add(slug);
    if (!name) error("name is required");
    if (!Number.isInteger(duration) || duration < 15) error("duration_minutes must be at least 15");
    if (!Number.isFinite(price) || price < 0) error("base_price_inr must be nonnegative");
    if (imageUrl) {
      try { if (new URL(imageUrl).protocol !== "https:") error("image_url must use HTTPS"); }
      catch { error("image_url must be a valid HTTPS URL"); }
    }
    const active = (record.is_active || "true").toLowerCase();
    if (!["true", "false"].includes(active)) error("is_active must be true or false");
    return {
      slug, name,
      kannada_name: record.kannada_name?.trim() || "",
      description: record.description?.trim() || "",
      duration_minutes: duration,
      base_price_inr: price,
      image_url: imageUrl || null,
      seo_title: record.seo_title?.trim() || null,
      seo_description: record.seo_description?.trim() || null,
      is_active: active === "true",
      updated_at: new Date().toISOString(),
    };
  });

  const supabase = await createClient();
  // An import without a new photo should not remove a photo already uploaded for a product.
  const { data: existing, error: lookupError } = await supabase.from("poojas").select("slug,image_url").in("slug", rows.map((row) => row.slug));
  if (lookupError) redirect(`/content/poojas?error=${encodeURIComponent(lookupError.message)}`);
  const currentImages = new Map(existing?.map((item) => [item.slug, item.image_url]) || []);
  rows.forEach((row) => { if (!row.image_url) row.image_url = currentImages.get(row.slug) || null; });
  const { error } = await supabase.from("poojas").upsert(rows, { onConflict: "slug" });
  if (error) redirect(`/content/poojas?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "bulk_import", "pooja", "catalog", `${rows.length} products`);
  revalidatePath("/content/poojas");
  revalidatePath("/");
  redirect(`/content/poojas?success=${encodeURIComponent(`${rows.length} products imported`)}`);
}

export async function togglePooja(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const next = text(formData, "next") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("poojas").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/content/poojas?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, next ? "activate" : "deactivate", "pooja", id);
  revalidatePath("/content/poojas");
}

export async function savePage(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const id = text(formData, "id");
  const status = text(formData, "status") || "draft";
  const faqText = text(formData, "faq_items");
  let faqItems: unknown[] = [];
  if (faqText) {
    try { faqItems = JSON.parse(faqText); } catch { redirect("/content/pages/new?error=FAQ+JSON+is+invalid"); }
  }
  const payload = {
    slug: text(formData, "slug"), page_type: text(formData, "page_type"),
    title: text(formData, "title"), description: text(formData, "description"),
    content_md: text(formData, "content_md"), target_keywords: list(text(formData, "target_keywords")),
    locale: text(formData, "locale") || "en-IN", city_slug: text(formData, "city_slug") || null,
    pooja_slug: text(formData, "pooja_slug") || null, canonical_url: text(formData, "canonical_url") || null,
    meta_robots: text(formData, "meta_robots") || "index,follow", faq_items: faqItems,
    structured_data: {}, generation_brief: { audience: text(formData, "audience"), search_intent: text(formData, "search_intent") },
    status, created_by: actor.id, published_by: status === "published" ? actor.id : null,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  let pageId = id;
  if (id) {
    const { data: current } = await supabase.from("programmatic_pages").select("*").eq("id", id).single();
    if (current) await supabase.from("content_revisions").insert({ page_id: id, version: current.version, snapshot: current, change_note: text(formData, "change_note"), created_by: actor.id });
    const { error } = await supabase.from("programmatic_pages").update({ ...payload, version: (current?.version || 1) + 1 }).eq("id", id);
    if (error) redirect(`/content/pages/new?id=${id}&error=${encodeURIComponent(error.message)}`);
  } else {
    const { data, error } = await supabase.from("programmatic_pages").insert(payload).select("id").single();
    if (error) redirect(`/content/pages/new?error=${encodeURIComponent(error.message)}`);
    pageId = data.id;
  }
  await audit(actor.id, id ? "update" : "create", "programmatic_page", pageId, payload.title);
  revalidatePath("/content/pages"); revalidatePath("/seo"); revalidatePath("/");
  redirect("/content/pages");
}

export async function saveKeywordCluster(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const payload = {
    name: text(formData, "name"), slug: text(formData, "slug"), intent: text(formData, "intent"),
    locale: text(formData, "locale") || "en-IN", city_slug: text(formData, "city_slug") || null,
    pooja_slug: text(formData, "pooja_slug") || null, primary_keyword: text(formData, "primary_keyword"),
    supporting_keywords: list(text(formData, "supporting_keywords")), status: "active", created_by: actor.id,
  };
  const { data, error } = await supabase.from("seo_keyword_clusters").insert(payload).select("id").single();
  if (error) redirect(`/seo?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "create", "seo_keyword_cluster", data.id, payload.name);
  revalidatePath("/seo");
}

export async function reviewPriest(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const supabase = await createClient();
  const { error } = await supabase.from("priest_profiles").update({ verification_status: status, verified_by: actor.id, verified_at: status === "verified" ? new Date().toISOString() : null }).eq("id", id);
  if (error) redirect(`/priests?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, status, "priest_profile", id);
  revalidatePath("/priests"); revalidatePath("/");
}

export async function setPriestListingVisibility(formData: FormData) {
  const actor = await requireSuperAdmin();
  const intent = text(formData, "visibility");
  if (intent !== "show" && intent !== "hide") redirect("/priests?error=Choose+show+or+hide");
  let parsed: unknown;
  try { parsed = JSON.parse(text(formData, "ids")); } catch { parsed = null; }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 5000 ||
      parsed.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
    redirect("/priests?error=Select+between+1+and+5000+priests");
  }
  const ids = [...new Set(parsed as string[])];
  const supabase = await createClient();
  let changed = 0;
  for (let index = 0; index < ids.length; index += 250) {
    const { data, error } = await supabase.from("priest_profiles")
      .update({ is_listed: intent === "show", updated_at: new Date().toISOString() })
      .in("id", ids.slice(index, index + 250)).select("id");
    if (error) redirect(`/priests?error=${encodeURIComponent(error.message)}`);
    changed += data?.length || 0;
  }
  if (!changed) redirect("/priests?error=No+priest+profiles+were+updated");
  await audit(actor.id, intent === "show" ? "show_marketplace_listing" : "hide_marketplace_listing", "priest_profile", "batch", `${changed} priests`);
  revalidatePath("/priests"); revalidatePath("/seo/locations"); revalidatePath("/");
  redirect(`/priests?success=${encodeURIComponent(`${changed} priest ${changed === 1 ? "profile" : "profiles"} ${intent === "show" ? "shown" : "hidden"}`)}`);
}

export async function savePriestListing(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  if (!id) redirect("/priests?error=Priest+profile+is+required");

  const startingPrice = Number(formData.get("starting_price_inr") || 0);
  const maximumPrice = Number(formData.get("max_price_inr") || 0);
  if (startingPrice < 0 || maximumPrice < startingPrice) {
    redirect("/priests?error=Price+range+is+invalid");
  }

  const payload = {
    display_name: text(formData, "display_name"),
    profile_headline: text(formData, "profile_headline"),
    bio: text(formData, "bio"),
    photo_url: text(formData, "photo_url") || null,
    service_areas: formData.getAll("service_areas").map(String).map((item) => item.trim()).filter(Boolean),
    primary_service_area: text(formData, "primary_service_area") || null,
    languages: list(text(formData, "languages")),
    pooja_slugs: list(text(formData, "pooja_slugs")),
    portfolio_urls: text(formData, "portfolio_urls").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 30),
    starting_price_inr: startingPrice,
    max_price_inr: maximumPrice,
    updated_at: new Date().toISOString(),
  };
  if (!payload.service_areas.length || !payload.primary_service_area || !payload.service_areas.includes(payload.primary_service_area)) {
    redirect("/priests?error=Choose+a+primary+location+from+the+serving+locations");
  }
  const imagePrefix = `${getSupabaseConfig().url}/storage/v1/object/public/priest-images/`;
  if (payload.portfolio_urls.some((url) => !url.startsWith(imagePrefix))) redirect("/priests?error=Gallery+contains+an+invalid+image");
  const supabase = await createClient();
  const { error } = await supabase.from("priest_profiles").update(payload).eq("id", id);
  if (error) redirect(`/priests?error=${encodeURIComponent(error.message)}`);
  if (payload.pooja_slugs.length) {
    const services = payload.pooja_slugs.map((slug) => ({
      priest_id: id,
      pooja_slug: slug,
      price_paise: Math.max(startingPrice, 1) * 100,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("priest_services").upsert(services, { onConflict: "priest_id,pooja_slug" });
  }
  await audit(actor.id, "update_marketplace_listing", "priest_profile", id, payload.display_name);
  revalidatePath("/priests");
  revalidatePath("/seo/locations");
  revalidatePath("/");
}

export async function savePriestPhoto(priestId: string, photoUrl: string): Promise<{ error?: string }> {
  const actor = await requireSuperAdmin();
  const prefix = `${getSupabaseConfig().url}/storage/v1/object/public/priest-images/`;
  if (!/^[0-9a-f-]{36}$/i.test(priestId) || !photoUrl.startsWith(prefix)) {
    return { error: "The priest profile or uploaded photo is invalid." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("priest_profiles")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", priestId).select("id").maybeSingle();
  if (error || !data) return { error: error?.message || "Priest profile was not found." };
  await audit(actor.id, "update_priest_photo", "priest_profile", priestId);
  revalidatePath("/priests"); revalidatePath("/seo/locations"); revalidatePath("/");
  return {};
}

export async function savePriestGallery(priestId: string, portfolioUrls: string[]): Promise<{ error?: string }> {
  const actor = await requireSuperAdmin();
  const prefix = `${getSupabaseConfig().url}/storage/v1/object/public/priest-images/`;
  const urls = [...new Set(portfolioUrls.map((url) => String(url).trim()).filter(Boolean))];
  if (!/^[0-9a-f-]{36}$/i.test(priestId) || urls.length > 30 || urls.some((url) => !url.startsWith(prefix))) {
    return { error: "The priest profile or gallery images are invalid." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("priest_profiles")
    .update({ portfolio_urls: urls, updated_at: new Date().toISOString() })
    .eq("id", priestId).select("id").maybeSingle();
  if (error || !data) return { error: error?.message || "Priest profile was not found." };
  await audit(actor.id, "update_priest_gallery", "priest_profile", priestId, `${urls.length} images`);
  revalidatePath("/priests"); revalidatePath("/seo/locations"); revalidatePath("/");
  return {};
}

export async function setAccountState(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const active = text(formData, "active") === "true";
  const note = text(formData, "note");
  if (!id || id === actor.id) redirect("/users?error=You+cannot+change+your+own+account+state");
  const supabase = await createClient();
  const { error } = await supabase.from("app_users").update({ is_active: active, moderation_note: note || null, moderated_at: new Date().toISOString(), moderated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, active ? "reactivate" : "suspend", "app_user", id, note);
  revalidatePath("/users"); revalidatePath("/");
}

export async function changeAccountRole(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const role = text(formData, "role");
  if (!id || id === actor.id) redirect("/users?error=You+cannot+change+your+own+role");
  if (!["customer", "priest", "support", "admin"].includes(role)) redirect("/users?error=Unsupported+role");
  const supabase = await createClient();
  const { error } = await supabase.from("app_users").update({ role, moderated_at: new Date().toISOString(), moderated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "change_role", "app_user", id, role);
  revalidatePath("/users"); revalidatePath("/priests"); revalidatePath("/");
}

export async function reportAccount(formData: FormData) {
  const actor = await requireSuperAdmin();
  const reportedUserId = text(formData, "id");
  const category = text(formData, "category") || "other";
  const details = text(formData, "details");
  if (!reportedUserId || reportedUserId === actor.id) redirect("/users?error=You+cannot+report+yourself");
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_reports").insert({ reported_user_id: reportedUserId, reported_by: actor.id, category, details }).select("id").single();
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "report", "app_user", reportedUserId, `${category}: ${details}`);
  revalidatePath("/users");
  if (data?.id) redirect(`/users?success=${encodeURIComponent("Report added to the review queue")}`);
}

export async function resolveUserReport(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const note = text(formData, "resolution_note");
  if (!["resolved", "dismissed", "reviewing"].includes(status)) redirect("/users?error=Unsupported+report+status");
  const supabase = await createClient();
  const { error } = await supabase.from("user_reports").update({ status, resolution_note: note, resolved_by: actor.id, resolved_at: status === "reviewing" ? null : new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, `report_${status}`, "user_report", id, note);
  revalidatePath("/users");
}

export async function inviteAccount(formData: FormData) {
  const actor = await requireSuperAdmin();
  const email = text(formData, "email").toLowerCase();
  const fullName = text(formData, "full_name");
  const role = text(formData, "role") || "priest";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2) redirect("/users?error=Enter+a+valid+name+and+email");
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-user-management", { body: { email, full_name: fullName, role } });
  if (error) {
    const response = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    redirect(`/users?error=${encodeURIComponent(String(response?.error || error.message))}`);
  }
  if (data?.error || !data?.ok) redirect(`/users?error=${encodeURIComponent(String(data?.error || "Invitation was not confirmed"))}`);
  await audit(actor.id, "invite_requested", "app_user", email, role);
  revalidatePath("/users"); revalidatePath("/priests");
  redirect(`/users?success=${encodeURIComponent(`Invitation sent to ${email}`)}`);
}

export async function onboardPriest(formData: FormData) {
  const actor = await requireSuperAdmin();
  const startingPrice = Number(formData.get("starting_price_inr") || 0);
  const maximumPrice = Number(formData.get("max_price_inr") || startingPrice);
  const payload = {
    email: text(formData, "email").toLowerCase(),
    login_username: text(formData, "login_username").toLowerCase(),
    password: text(formData, "password"),
    full_name: text(formData, "full_name"),
    phone: text(formData, "phone"),
    profile_headline: text(formData, "profile_headline"),
    bio: text(formData, "bio"),
    years_experience: Number(formData.get("years_experience") || 0),
    service_areas: formData.getAll("service_areas").map(String).map((item) => item.trim()).filter(Boolean),
    primary_service_area: text(formData, "primary_service_area"),
    languages: formData.getAll("languages").map(String),
    pooja_slugs: formData.getAll("pooja_slugs").map(String),
    photo_url: text(formData, "photo_url"),
    portfolio_urls: text(formData, "portfolio_urls").split("\n").map((item) => item.trim()).filter(Boolean),
    starting_price_inr: startingPrice,
    max_price_inr: maximumPrice,
    verification_status: text(formData, "verification_status") || "pending",
  };
  if ((payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) || payload.full_name.length < 2) redirect("/priests?error=Enter+a+valid+name+and+optional+email");
  if (!/^[a-z0-9._-]{3,32}$/.test(payload.login_username)) redirect("/priests?error=Username+must+be+3-32+lowercase+letters%2C+numbers%2C+dots%2C+underscores%2C+or+hyphens");
  if (payload.password.length < 12 || payload.password.length > 72) redirect("/priests?error=Password+must+contain+12-72+characters");
  if (payload.phone.replace(/\D/g, "").length < 7 || !payload.profile_headline || !payload.bio) redirect("/priests?error=Phone%2C+headline%2C+and+about+are+required");
  if (!payload.service_areas.length || !payload.primary_service_area || !payload.service_areas.includes(payload.primary_service_area) || !payload.languages.length || !payload.pooja_slugs.length) redirect("/priests?error=Select+serving+locations%2C+a+primary+location%2C+a+language%2C+and+at+least+one+puja");
  if (startingPrice < 0 || maximumPrice < startingPrice) redirect("/priests?error=Price+range+is+invalid");

  const { data, error } = await runManagedPriestImport([payload as PriestImportRow]);
  if (error || data?.failed) {
    const rowError = data?.results?.[0]?.error;
    redirect(`/priests?error=${encodeURIComponent(rowError || error || "Could not onboard Purohit")}`);
  }
  await audit(actor.id, "onboard_priest", "priest_profile", String(data.results[0].priest_profile_id), payload.full_name);
  revalidatePath("/priests"); revalidatePath("/users"); revalidatePath("/seo/locations"); revalidatePath("/");
  redirect(`/priests?success=${encodeURIComponent(`${payload.full_name} was onboarded with username ${payload.login_username}. Share the copied credentials with the priest.`)}`);
}

export async function bulkOnboardPriests(formData: FormData) {
  const actor = await requireSuperAdmin();
  let records: Record<string, string>[];
  const reviewedRows = formData.get("rows_json");
  if (typeof reviewedRows === "string") {
    try {
      const parsed: unknown = JSON.parse(reviewedRows);
      if (!Array.isArray(parsed) || !parsed.length || parsed.length > 250) throw new Error();
      records = parsed.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error();
        return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "").trim()]));
      });
    } catch {
      redirect("/priests?error=Could+not+read+the+reviewed+roster");
    }
  } else {
    const file = formData.get("roster_file");
    if (!(file instanceof File) || file.size === 0) redirect("/priests?error=Choose+a+CSV+or+Excel+file+to+import");
    if (file.size > 2_000_000) redirect("/priests?error=Roster+file+must+be+smaller+than+2MB");
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xlsb"].includes(extension || "")) redirect("/priests?error=Use+a+CSV%2C+XLSX%2C+or+XLSB+file");
    try {
      if (extension === "csv") {
        records = parse(await file.text(), {
          columns: (headers: string[]) => headers.map((header) => header.trim()),
          skip_empty_lines: true,
          trim: true,
          bom: true,
          skip_records_with_error: false,
        });
      } else {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error("Empty workbook");
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "", blankrows: false });
        const headers = (rows[0] || []).map((value) => String(value ?? "").trim());
        if (!headers.length || new Set(headers).size !== headers.length) throw new Error("Invalid headers");
        records = rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim())).map((row) =>
          Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])),
        );
      }
    } catch {
      redirect("/priests?error=Could+not+read+the+roster.+Check+the+headers+and+file+format");
    }
  }
  if (!records.length || records.length > 250) redirect("/priests?error=Import+between+1+and+250+Purohits+at+a+time");
  const requiredColumns = ["full_name", "phone", "profile_headline", "bio", "service_areas", "languages", "pooja_slugs", "starting_price_inr", "max_price_inr", "verification_status"];
  const missingColumns = requiredColumns.filter((column) => !(column in records[0]));
  if (missingColumns.length) redirect(`/priests?error=${encodeURIComponent(`Missing roster columns: ${missingColumns.join(", ")}`)}`);

  const priests: PriestImportRow[] = records.map((row) => ({
    full_name: String(row.full_name || "").trim(),
    email: String(row.email || "").trim().toLowerCase(),
    login_username: String(row.login_username || "").trim().toLowerCase(),
    password: String(row.password || "").trim(),
    phone: String(row.phone || "").trim(),
    profile_headline: String(row.profile_headline || "").trim(),
    bio: String(row.bio || "").trim(),
    years_experience: Number(row.years_experience || 0),
    service_areas: pipeList(row.service_areas),
    primary_service_area: String(row.primary_service_area || "").trim(),
    languages: pipeList(row.languages),
    pooja_slugs: pipeList(row.pooja_slugs),
    starting_price_inr: Number(row.starting_price_inr || 0),
    max_price_inr: Number(row.max_price_inr || row.starting_price_inr || 0),
    photo_url: String(row.photo_url || "").trim(),
    portfolio_urls: pipeList(row.portfolio_urls),
    verification_status: row.verification_status === "verified" ? "verified" : "pending",
  }));
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (let index = 0; index < priests.length; index += 1) {
    const priest = priests[index];
    const rowNumber = index + 2;
    const fail = (message: string) => redirect(`/priests?error=${encodeURIComponent(`Roster row ${rowNumber}: ${message}`)}`);
    if (priest.full_name.length < 2) fail("full_name needs at least two characters");
    if (priest.phone!.replace(/\D/g, "").length < 7 || priest.phone!.replace(/\D/g, "").length > 15) fail("phone must contain 7–15 digits");
    const phoneKey = priest.phone!.replace(/\D/g, "");
    if (phones.has(phoneKey)) fail("phone appears more than once in this file");
    phones.add(phoneKey);
    if (!priest.profile_headline || !priest.bio) fail("profile_headline and bio are required");
    if (priest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(priest.email)) fail("email is invalid");
    if (priest.email && emails.has(priest.email)) fail("email appears more than once in this file");
    if (priest.email) emails.add(priest.email);
    if (!priest.service_areas.length || !priest.languages.length || !priest.pooja_slugs.length) fail("service_areas, languages, and pooja_slugs are required");
    if (!Number.isInteger(priest.years_experience) || priest.years_experience < 0 || priest.years_experience > 80) fail("years_experience must be 0–80");
    if (!records[index].starting_price_inr?.trim() || !records[index].max_price_inr?.trim()) fail("starting_price_inr and max_price_inr are required");
    if (!Number.isFinite(priest.starting_price_inr) || priest.starting_price_inr < 0 || !Number.isFinite(priest.max_price_inr) || priest.max_price_inr < priest.starting_price_inr) fail("price range is invalid");
    if (!["pending", "verified"].includes(records[index].verification_status)) fail("verification_status must be pending or verified");
    for (const imageUrl of [priest.photo_url, ...priest.portfolio_urls].filter(Boolean)) {
      let url: URL;
      try { url = new URL(imageUrl!); }
      catch { fail("image URL is invalid"); }
      if (url!.protocol !== "https:") fail("image URLs must use HTTPS");
    }
  }
  const results: Array<{ row: number; ok: boolean; error?: string }> = [];
  for (let start = 0; start < priests.length; start += 125) {
    const group = await Promise.all(Array.from({ length: 5 }, (_, index) => {
      const offset = start + index * 25;
      const chunk = priests.slice(offset, offset + 25);
      return chunk.length ? runManagedPriestImport(chunk).then((result) => ({ offset, chunk, result })) : null;
    }).filter((task) => task !== null));
    for (const { offset, chunk, result } of group) {
      if (result.error || !Array.isArray(result.data?.results)) {
        chunk.forEach((_, index) => results.push({ row: offset + index + 1, ok: false, error: result.error || "Import service did not respond" }));
      } else {
        result.data.results.forEach((entry: { row: number; ok: boolean; error?: string }) => results.push({ ...entry, row: offset + entry.row }));
      }
    }
  }
  const succeeded = results.filter((result) => result.ok).length;
  const failed = results.length - succeeded;
  await audit(actor.id, "bulk_onboard_priests_requested", "priest_profile_batch", crypto.randomUUID(), `${succeeded}/${priests.length} onboarded`);
  revalidatePath("/priests"); revalidatePath("/users"); revalidatePath("/seo/locations"); revalidatePath("/");
  const failures = results.filter((result) => !result.ok).slice(0, 3).map((result) => `row ${result.row + 1}: ${result.error || "unknown error"}`).join("; ");
  const message = `${succeeded} of ${priests.length} Purohits onboarded${failed ? `. Failed: ${failures}` : ""}`;
  redirect(`/priests?${failed ? "error" : "success"}=${encodeURIComponent(message)}`);
}

export async function verifyPaymentSubmission(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/payment-workflow`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: publishableKey },
    body: JSON.stringify({ action: "admin_verify_payment", payment_submission_id: id, admin_user_id: actor.id }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) redirect(`/payments?error=${encodeURIComponent(payload.error || "Could not verify payment")}`);
  await audit(actor.id, "admin_verify", "payment_submission", id);
  revalidatePath("/payments");
  revalidatePath("/");
}

export async function approveProviderRelease(formData: FormData) {
  const actor = await requireSuperAdmin();
  const earningId = text(formData, "earning_id");
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login?error=session_expired");

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/payment-workflow`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "approve_provider_release", earning_id: earningId }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) redirect(`/payments?error=${encodeURIComponent(payload.error || "Could not queue provider release")}`);
  await audit(actor.id, "approve_provider_release", "provider_earning", earningId);
  revalidatePath("/payments");
  revalidatePath("/");
}
