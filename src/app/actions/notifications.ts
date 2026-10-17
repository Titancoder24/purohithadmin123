"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const audiences = new Set(["all", "customers", "priests"]);
const destinations = new Set(["notifications", "home", "bookings", "priests", "profile"]);
const channels = new Set(["all", "mobile", "web"]);

export async function sendNotificationCampaign(formData: FormData) {
  const actor = await requireSuperAdmin();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const audience = String(formData.get("audience") || "all").trim();
  const deepLink = String(formData.get("deep_link") || "notifications").trim();
  const channel = String(formData.get("channel") || "all").trim();

  if (!title || title.length > 80) redirect("/notifications?error=Title+must+contain+1-80+characters");
  if (!body || body.length > 220) redirect("/notifications?error=Message+must+contain+1-220+characters");
  if (!audiences.has(audience) || !destinations.has(deepLink) || !channels.has(channel)) redirect("/notifications?error=Choose+valid+campaign+settings");

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-notifications", {
    body: { action: "send_campaign", title, body, audience, deep_link: deepLink, channel },
  });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const response = await error.context.json().catch(() => null);
      message = String(response?.error || message);
    }
    redirect(`/notifications?error=${encodeURIComponent(message)}`);
  }
  if (data?.error) redirect(`/notifications?error=${encodeURIComponent(String(data.error))}`);

  await supabase.from("admin_actions").insert({
    actor_id: actor.id,
    action: "send_notification_campaign",
    target_type: "notification_campaign",
    target_id: data?.campaign_id || "unknown",
    note: `${title} · ${data?.recipients || 0} recipients`,
  });
  revalidatePath("/notifications");
  redirect(`/notifications?success=${encodeURIComponent(`Campaign sent to ${data?.recipients || 0} accounts; ${data?.push_sent || 0} mobile and ${data?.web_push_sent || 0} browser pushes delivered`)}`);
}
