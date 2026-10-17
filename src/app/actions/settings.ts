"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { normalizeAppearance } from "@/lib/appearance";
import { createClient } from "@/lib/supabase/server";

export async function updateServiceFee(formData: FormData) {
  const actor = await requireAdmin();
  const rawFee = formData.get("service_fee_percent");
  const feePercent = Number(rawFee);

  if (![5, 10].includes(feePercent)) {
    redirect("/settings?error=Platform+fee+must+be+5+or+10+percent");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key: "payment_service_fee_percent",
      value: String(feePercent),
      description: "Percentage platform charge added to the published pooja price on new bookings",
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message || "Failed to update service charge")}`);
  }

  await supabase.from("admin_actions").insert({
    actor_id: actor.id,
    action: "update_setting",
    target_type: "platform_settings",
    target_id: "payment_service_fee_percent",
    note: `Updated payment service charge to ${feePercent}%`,
  });

  revalidatePath("/settings");
  revalidatePath("/payments");
  redirect("/settings?success=Service+charge+updated+successfully");
}

export async function updateBiddingMode(formData: FormData) {
  const actor = await requireSuperAdmin();
  const enabled = formData.get("bidding_enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert({
    key: "booking_bidding_enabled",
    value: String(enabled),
    description: "Allow customers to request and select priest proposals",
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  await supabase.from("admin_actions").insert({
    actor_id: actor.id, action: "update_setting", target_type: "platform_settings",
    target_id: "booking_bidding_enabled", note: `Bidding ${enabled ? "enabled" : "disabled"}`,
  });
  revalidatePath("/settings");
  redirect(`/settings?success=${encodeURIComponent(`Customer bidding ${enabled ? "enabled" : "disabled"}`)}`);
}

export async function awardProposalAsAdmin(formData: FormData) {
  const actor = await requireSuperAdmin();
  const requestId = String(formData.get("request_id") || "");
  const proposalId = String(formData.get("proposal_id") || "");
  const uuid = /^[0-9a-f-]{36}$/i;
  if (!uuid.test(requestId) || !uuid.test(proposalId)) redirect("/proposals?error=Invalid+proposal");
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("payment-workflow", { body: { action: "award_proposal", request_id: requestId, proposal_id: proposalId } });
  if (error || data?.error) redirect(`/proposals?error=${encodeURIComponent(String(data?.error || error?.message || "Proposal could not be selected"))}`);
  await supabase.from("admin_actions").insert({ actor_id: actor.id, action: "award_proposal", target_type: "ceremony_proposal", target_id: proposalId, note: `Selected proposal for request ${requestId}` });
  revalidatePath("/proposals");
  redirect("/proposals?success=Proposal+selected");
}

export async function saveAdminAppearance(formData: FormData) {
  const actor = await requireAdmin();
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("appearance") || ""));
  } catch {
    redirect("/settings?error=Theme+could+not+be+read");
  }
  const appearance = normalizeAppearance(parsed);
  const supabase = await createClient();
  const key = `admin_console_theme:${actor.id}`;
  const { error } = await supabase.from("platform_settings").upsert({
    key,
    value: JSON.stringify(appearance),
    description: "Personal admin console palette, button shape, and button style",
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message || "Failed to apply theme")}`);

  await supabase.from("admin_actions").insert({
    actor_id: actor.id,
    action: "update_setting",
    target_type: "platform_settings",
    target_id: key,
    note: `Applied ${appearance.preset} theme to this admin console`,
  });

  revalidatePath("/", "layout");
  redirect("/settings?success=Console+theme+applied");
}
