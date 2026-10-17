import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.get("recovery") !== "1") {
    return NextResponse.redirect(new URL("/login?error=Invalid+reset+link", request.url));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=Reset+link+expired", request.url));
  const { data: profile } = await supabase.from("app_users").select("role,is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active || !["admin", "super_admin"].includes(profile.role)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=Administrator+access+required", request.url));
  }
  const response = NextResponse.redirect(new URL("/reset-password", request.url));
  response.cookies.set("admin-recovery", "1", { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/reset-password" });
  return response;
}
