import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const priestPassword = process.env.TEST_PRIEST_PASSWORD;
const username = process.env.TEST_PRIEST_USERNAME || "qa-priest-login";
if (!url || !key || !adminEmail || !adminPassword || !priestPassword) throw new Error("Missing integration-test environment variables");

const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "content-type": "application/json" },
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
});
const adminSession = await authResponse.json();
if (!authResponse.ok || !adminSession.access_token) throw new Error(`Admin sign-in failed: ${adminSession.msg || adminSession.error_description || authResponse.status}`);

const onboardResponse = await fetch(`${url}/functions/v1/admin-user-management`, {
  method: "POST",
  headers: { apikey: key, authorization: `Bearer ${adminSession.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ action: "bulk_onboard_priests", priests: [{
    full_name: "QA CSV Priest A",
    login_username: username,
    password: priestPassword,
    phone: "+91 9000000101",
    profile_headline: "Synthetic QA priest profile",
    bio: "Synthetic profile created to test admin imports and customer visibility.",
    years_experience: 3,
    service_areas: ["Jayanagar", "JP Nagar"],
    primary_service_area: "Jayanagar",
    languages: ["Kannada", "English"],
    pooja_slugs: ["ganesh-pooja", "satyanarayan"],
    starting_price_inr: 1000,
    max_price_inr: 2000,
    portfolio_urls: [],
    verification_status: "verified",
  }] }),
});
const onboard = await onboardResponse.json();
if (!onboardResponse.ok || onboard.failed || !onboard.results?.[0]?.ok) throw new Error(`Onboarding failed: ${onboard.error || onboard.results?.[0]?.error || onboardResponse.status}`);

const loginResponse = await fetch(`${url}/functions/v1/priest-password-login`, {
  method: "POST",
  headers: { apikey: key, "content-type": "application/json" },
  body: JSON.stringify({ identifier: username, password: priestPassword }),
});
const login = await loginResponse.json();
if (!loginResponse.ok || !login.access_token || !login.refresh_token) throw new Error(`Priest login failed: ${login.error || loginResponse.status}`);

const profileResponse = await fetch(`${url}/rest/v1/app_users?select=id,role,is_active,full_name&id=eq.${login.user.id}`, {
  headers: { apikey: key, authorization: `Bearer ${login.access_token}` },
});
const profiles = await profileResponse.json();
if (!profileResponse.ok || profiles?.[0]?.role !== "priest" || profiles?.[0]?.is_active !== true) throw new Error("Authenticated priest profile validation failed");

console.log(JSON.stringify({ ok: true, username, user_id: login.user.id, role: profiles[0].role }));
