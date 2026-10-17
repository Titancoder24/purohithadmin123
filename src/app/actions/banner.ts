"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_ROLE_PICKER_BANNER, ROLE_PICKER_BANNER_KEY, normalizeRolePickerBanner } from "@/lib/banner";
import { createClient } from "@/lib/supabase/server";

export async function saveRolePickerBanner(formData: FormData) {
  const actor = await requireAdmin();
  const reset = formData.get("reset") === "1";
  const banner = reset ? DEFAULT_ROLE_PICKER_BANNER : normalizeRolePickerBanner({
    badge: formData.get("badge"),
    title: formData.get("title"),
    imageUrl: formData.get("image_url"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert({
    key: ROLE_PICKER_BANNER_KEY,
    value: JSON.stringify(banner),
    description: "Welcome screen (role picker) banner text and image shown in the customer and purohit apps",
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) redirect(`/content/banners?error=${encodeURIComponent(error.message || "Failed to save the banner")}`);

  await supabase.from("admin_actions").insert({
    actor_id: actor.id,
    action: "update_setting",
    target_type: "platform_settings",
    target_id: ROLE_PICKER_BANNER_KEY,
    note: reset ? "Reset the welcome banner to the default" : `Updated the welcome banner: ${banner.title.replace(/\n/g, " ")}`,
  });

  revalidatePath("/content/banners");
  redirect(`/content/banners?success=${encodeURIComponent(reset ? "Banner reset to the default" : "Banner published. Apps show it the next time the welcome screen opens.")}`);
}
