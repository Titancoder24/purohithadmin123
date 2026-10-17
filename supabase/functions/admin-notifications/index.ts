import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPush } from "../_shared/webPush.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const AUDIENCES = new Set(["all", "customers", "priests"]);
const CHANNELS = new Set(["all", "mobile", "web"]);
const DEEP_LINKS = new Set(["notifications", "home", "bookings", "priests", "profile"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let campaignId = "";
  try {
    const actorId = await requireSuperAdmin(req, supabase);
    if (!actorId) return json({ error: "Super Admin access is required" }, 403);
    const body = await req.json().catch(() => ({}));
    if (body.action !== "send_campaign") return json({ error: "Unknown action" }, 400);

    const title = clean(body.title);
    const message = clean(body.body);
    const audience = clean(body.audience);
    const channel = clean(body.channel) || "all";
    const deepLink = clean(body.deep_link) || "notifications";
    if (!title || title.length > 80) return json({ error: "Title must contain 1–80 characters" }, 400);
    if (!message || message.length > 220) return json({ error: "Message must contain 1–220 characters" }, 400);
    if (!AUDIENCES.has(audience)) return json({ error: "Choose a valid audience" }, 400);
    if (!CHANNELS.has(channel)) return json({ error: "Choose a valid channel" }, 400);
    if (!DEEP_LINKS.has(deepLink)) return json({ error: "Choose a valid destination" }, 400);

    const { data: campaign, error: campaignError } = await supabase.from("notification_campaigns").insert({
      title,
      body: message,
      audience,
      channel,
      deep_link: deepLink,
      created_by: actorId,
      status: "sending",
    }).select("id").single();
    if (campaignError) throw campaignError;
    campaignId = campaign.id;

    const userIds = await listAudienceUsers(supabase, audience);
    const notificationData = { type: "marketing", campaignId, deepLink, channel };
    let inAppCount = 0;
    for (let index = 0; index < userIds.length; index += 500) {
      const rows = userIds.slice(index, index + 500).map((userId) => ({
        user_id: userId,
        type: "marketing",
        title,
        body: message,
        data: notificationData,
      }));
      const { error } = await supabase.from("app_notifications").insert(rows);
      if (error) throw error;
      inAppCount += rows.length;
    }

    const tokens = channel === "web" ? [] : await listPushTokens(supabase, userIds);
    const delivery = await sendExpoPush(supabase, tokens, title, message, notificationData);
    const webDelivery = channel === "mobile" ? { sent: 0, failed: 0, subscriptions: 0 }
      : await sendWebPush(supabase, userIds, { title, body: message, data: notificationData }).catch((error) => {
        console.warn("Web push failed", String((error as Error)?.message || error));
        return { sent: 0, failed: 0, subscriptions: 0 };
      });
    await recordCampaignPushAnalytics(supabase, campaignId, delivery);
    await recordCampaignPushAnalytics(supabase, campaignId, webDelivery, "web");
    const status = delivery.failed + webDelivery.failed > 0 ? (delivery.sent + webDelivery.sent + inAppCount > 0 ? "partial" : "failed") : "sent";
    const { error: updateError } = await supabase.from("notification_campaigns").update({
      status,
      recipient_count: userIds.length,
      in_app_count: inAppCount,
      push_token_count: tokens.length,
      push_success_count: delivery.sent,
      push_failure_count: delivery.failed,
      web_push_success_count: webDelivery.sent,
      web_push_failure_count: webDelivery.failed,
      sent_at: new Date().toISOString(),
    }).eq("id", campaignId);
    if (updateError) throw updateError;

    return json({
      ok: true,
      campaign_id: campaignId,
      recipients: userIds.length,
      in_app: inAppCount,
      push_tokens: tokens.length,
      push_sent: delivery.sent,
      push_failed: delivery.failed,
      web_push_sent: webDelivery.sent,
      web_push_failed: webDelivery.failed,
    });
  } catch (error) {
    const message = String((error as Error)?.message || error).slice(0, 500);
    if (campaignId) {
      await supabase.from("notification_campaigns").update({
        status: "failed",
        error_message: message,
        sent_at: new Date().toISOString(),
      }).eq("id", campaignId);
    }
    return json({ error: message }, 500);
  }
});

async function requireSuperAdmin(req: Request, supabase: SupabaseClient) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) return null;
  const { data: profile } = await supabase.from("app_users")
    .select("id,role,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();
  return profile?.is_active && profile?.role === "super_admin" ? profile.id : null;
}

async function recordCampaignPushAnalytics(
  supabase: SupabaseClient,
  campaignId: string,
  delivery: { sent: number; failed: number },
  platform?: string,
) {
  const rows = [
    delivery.sent ? { campaign_id: campaignId, notification_type: "marketing", channel: "push", platform: platform || null, event: "sent", event_count: delivery.sent } : null,
    delivery.failed ? { campaign_id: campaignId, notification_type: "marketing", channel: "push", platform: platform || null, event: "failed", event_count: delivery.failed } : null,
  ].filter(Boolean);
  if (!rows.length) return;
  const { error } = await supabase.from("notification_delivery_events").insert(rows);
  if (error) console.warn("Notification analytics insert failed", error.message);
}

async function listAudienceUsers(supabase: SupabaseClient, audience: string) {
  const roles = audience === "all" ? ["customer", "priest"] : [audience === "customers" ? "customer" : "priest"];
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("app_users")
      .select("id")
      .eq("is_active", true)
      .in("role", roles)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    ids.push(...(data || []).map((row: { id: string }) => row.id));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

async function listPushTokens(supabase: SupabaseClient, userIds: string[]) {
  const tokens = new Set<string>();
  for (let index = 0; index < userIds.length; index += 200) {
    const { data, error } = await supabase.from("push_tokens").select("token").in("user_id", userIds.slice(index, index + 200));
    if (error) throw error;
    for (const row of data || []) if (EXPO_TOKEN.test(row.token)) tokens.add(row.token);
  }
  return [...tokens];
}

async function sendExpoPush(supabase: SupabaseClient, tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  let sent = 0;
  let failed = 0;
  const stale: string[] = [];
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  for (let index = 0; index < tokens.length; index += 100) {
    const batchTokens = tokens.slice(index, index + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify(batchTokens.map((token) => ({
        to: token,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "marketing",
        data,
      }))),
    });
    const result = await response.json().catch(() => ({}));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    if (!response.ok) {
      failed += batchTokens.length;
      continue;
    }
    tickets.forEach((ticket: { status?: string; details?: { error?: string } }, ticketIndex: number) => {
      if (ticket?.status === "ok") sent += 1;
      else {
        failed += 1;
        if (ticket?.details?.error === "DeviceNotRegistered") stale.push(batchTokens[ticketIndex]);
      }
    });
    if (tickets.length < batchTokens.length) failed += batchTokens.length - tickets.length;
  }
  if (stale.length) await supabase.from("push_tokens").delete().in("token", stale);
  return { sent, failed };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getSupabaseSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    const parsed = JSON.parse(secretKeys);
    if (parsed.default) return parsed.default;
  }
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRole) return serviceRole;
  throw new Error("Supabase secret key is not configured.");
}
