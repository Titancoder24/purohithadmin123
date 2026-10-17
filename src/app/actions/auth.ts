"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/forgot-password?error=Enter+a+valid+email+address");
  const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  let callbackUrl: string;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("Invalid origin");
    callbackUrl = new URL("/auth/callback?recovery=1", parsed).toString();
  } catch {
    redirect("/forgot-password?error=Reset+is+temporarily+unavailable");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl });
  if (error) redirect("/forgot-password?error=Could+not+send+the+reset+email.+Please+try+again+later");
  redirect("/forgot-password?sent=1");
}

export async function updateAdminPassword(formData: FormData) {
  await requireAdmin();
  const cookieStore = await cookies();
  if (cookieStore.get("admin-recovery")?.value !== "1") redirect("/login?error=Reset+link+expired.+Request+a+new+one");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");
  if (password.length < 12 || password.length > 72 || password !== confirm) {
    redirect("/reset-password?error=Passwords+must+match+and+contain+12-72+characters");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  cookieStore.set("admin-recovery", "", { path: "/reset-password", maxAge: 0 });
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?success=Password+changed.+Sign+in+with+your+new+password");
}
