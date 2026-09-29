import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-application-name, apikey, content-type",
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json" },
});

const invalid = () => reply({ error: "Invalid username, email, or password" }, 400);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const { identifier: rawIdentifier, password: rawPassword } = await req.json().catch(() => ({}));
  const identifier = String(rawIdentifier || "").trim().toLowerCase();
  const password = String(rawPassword || "");
  if ((!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && !/^[a-z0-9._-]{3,32}$/.test(identifier)) || password.length < 12 || password.length > 72) return invalid();

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  let email = identifier;
  let expectedUserId = "";

  if (!identifier.includes("@")) {
    const { data: alias } = await service.from("priest_login_aliases").select("user_id").eq("username", identifier).maybeSingle();
    if (!alias?.user_id) return invalid();
    expectedUserId = alias.user_id;
    const { data: authRecord } = await service.auth.admin.getUserById(alias.user_id);
    email = authRecord.user?.email || "";
    if (!email) return invalid();
  }

  if (expectedUserId) {
    const { data: account } = await service.from("app_users").select("role,is_active").eq("id", expectedUserId).maybeSingle();
    if (!account?.is_active || account.role !== "priest") return invalid();
  }

  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return invalid();

  const { data: appUser } = await service.from("app_users").select("role,is_active").eq("id", data.user.id).maybeSingle();
  if (!appUser?.is_active || appUser.role !== "priest") {
    await auth.auth.signOut({ scope: "global" }).catch(() => {});
    return invalid();
  }

  return reply({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: data.user,
  });
});
