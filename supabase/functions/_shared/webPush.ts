import webPush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Subscription = { endpoint: string; p256dh: string; auth: string };

export async function sendWebPush(
  supabase: SupabaseClient,
  userIds: string[],
  message: { title: string; body: string; data: Record<string, unknown> },
) {
  const publicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey || !userIds.length) return { sent: 0, failed: 0, subscriptions: 0 };
  webPush.setVapidDetails("mailto:purohithconnect@gmail.com", publicKey, privateKey);

  const subscriptions: Subscription[] = [];
  for (let index = 0; index < userIds.length; index += 150) {
    const { data, error } = await supabase.from("web_push_subscriptions")
      .select("endpoint,p256dh,auth").in("user_id", userIds.slice(index, index + 150));
    if (error) {
      console.warn("Web push subscriptions unavailable", error.message);
      return { sent: 0, failed: 0, subscriptions: 0 };
    }
    subscriptions.push(...(data || []));
  }

  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify(message);
  for (let index = 0; index < subscriptions.length; index += 20) {
    const batch = subscriptions.slice(index, index + 20);
    await Promise.all(batch.map(async (subscription) => {
      try {
        await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 3600 });
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("web_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        } else console.warn("Web push delivery failed", status || String(error));
      }
    }));
  }
  return { sent, failed, subscriptions: subscriptions.length };
}
