"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateServiceFee(formData: FormData) {
  const actor = await requireAdmin();
  const rawFee = formData.get("service_fee_percent");
  const feePercent = Number(rawFee);

  if (isNaN(feePercent) || feePercent < 0 || feePercent > 50) {
    redirect("/settings?error=Service+charge+must+be+a+valid+percentage+between+0+and+50");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key: "payment_service_fee_percent",
      value: String(feePercent),
      description: "Percentage service charge applied to bookings and provider earnings",
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
