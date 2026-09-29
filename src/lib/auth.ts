import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AdminIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "super_admin";
};

export async function requireAdmin(): Promise<AdminIdentity> {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("app_users")
    .select("id,email,full_name,role,is_active")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.is_active || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/login?error=unauthorized");
  }

  return {
    id: profile.id,
    email: profile.email || authData.user.email || "",
    fullName: profile.full_name || "Administrator",
    role: profile.role,
  };
}

export async function requireSuperAdmin() {
  const identity = await requireAdmin();
  if (identity.role !== "super_admin") redirect("/?error=super_admin_required");
  return identity;
}

