import { createClient } from "@/lib/supabase/server";
import type { AnalyticsModule, DailyMetric, FeatureMetric, HeatmapCell, Pooja, ProgrammaticPage } from "./types";

type Row = Record<string, unknown>;

const label = (value: unknown) => String(value || "Unknown").replaceAll("_", " ");
const countBy = (rows: Row[], key: string) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const name = label(row[key]);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts].map(([name, value]) => ({ label: name, value })).sort((a, b) => b.value - a.value);
};
const arrayCount = (rows: Row[], key: string) => {
  const expanded: Row[] = [];
  rows.forEach((row) => Array.isArray(row[key]) && (row[key] as unknown[]).forEach((item) => expanded.push({ item })));
  return countBy(expanded, "item");
};
const dated = (rows: Row[], key = "created_at", days = 30) => {
  const output = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    output.set(date.toISOString().slice(0, 10), 0);
  }
  rows.forEach((row) => {
    const date = String(row[key] || "").slice(0, 10);
    if (output.has(date)) output.set(date, (output.get(date) || 0) + 1);
  });
  return [...output].map(([date, value]) => ({ label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(date)), value }));
};
const bands = (rows: Row[], key: string, ranges: Array<[string, number, number]>) => ranges.map(([name, min, max]) => ({
  label: name,
  value: rows.filter((row) => Number(row[key] || 0) >= min && Number(row[key] || 0) <= max).length,
}));
const makeModule = (title: string, description: string, type: AnalyticsModule["type"], data: AnalyticsModule["data"], valueLabel?: string): AnalyticsModule => ({ title, description, type, data, valueLabel });

export async function getDashboardData() {
  const supabase = await createClient();
  const [active, daily, features, users, priests, requests, pages] = await Promise.all([
    supabase.from("super_admin_active_user_metrics").select("*").maybeSingle(),
    supabase.from("super_admin_daily_metrics").select("*").order("day", { ascending: true }).limit(30),
    supabase.from("super_admin_feature_usage_30d").select("*").order("total_events", { ascending: false }).limit(8),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("priest_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("ceremony_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("programmatic_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  return {
    active: active.data || { daily_active_users: 0, weekly_active_users: 0, monthly_active_users: 0, sessions_30d: 0 },
    daily: (daily.data || []) as DailyMetric[],
    features: (features.data || []) as FeatureMetric[],
    totals: {
      users: users.count || 0,
      priests: priests.count || 0,
      openRequests: requests.count || 0,
      publishedPages: pages.count || 0,
    },
  };
}

export async function getPoojas() {
  const supabase = await createClient();
  const { data } = await supabase.from("poojas").select("*").order("updated_at", { ascending: false });
  return (data || []) as Pooja[];
}

export async function getPages() {
  const supabase = await createClient();
  const { data } = await supabase.from("super_admin_content_overview").select("*").order("updated_at", { ascending: false });
  return (data || []) as ProgrammaticPage[];
}

export async function getPeopleData() {
  const supabase = await createClient();
  const [users, priests] = await Promise.all([
    supabase.from("app_users").select("id,full_name,email,phone,role,is_active,moderation_note,moderated_at,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("priest_profiles").select("id,user_id,slug,display_name,profile_headline,bio,photo_url,portfolio_urls,verification_status,is_listed,rating,review_count,service_areas,primary_service_area,languages,pooja_slugs,starting_price_inr,max_price_inr,submitted_at,created_at").order("created_at", { ascending: false }).limit(5000),
  ]);
  return { users: users.data || [], priests: priests.data || [] };
}

export async function getOperationsAnalytics() {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("analytics_events").select("event_name,route,platform,user_id,session_id,created_at").gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString()).order("created_at", { ascending: true }).limit(5000),
    supabase.from("platform_sessions").select("id,user_id,anonymous_id,platform,user_agent,started_at,last_seen_at").order("last_seen_at", { ascending: false }).limit(1000),
    supabase.from("app_users").select("id,role,is_active,created_at").limit(5000),
    supabase.from("priest_profiles").select("verification_status,languages,service_areas,pooja_slugs,rating,years_experience,starting_price_inr,created_at").limit(5000),
    supabase.from("ceremony_requests").select("status,pooja_slug,budget_max_inr,created_at").limit(5000),
    supabase.from("ceremony_proposals").select("status,amount_inr,created_at").limit(5000),
    supabase.from("bookings").select("status,payment_status,pooja_slug,total_inr,created_at").limit(5000),
    supabase.from("payment_submissions").select("status,ai_verified,amount_inr,created_at").limit(5000),
    supabase.from("ai_agent_threads").select("user_role,last_intent,last_pooja_slug,agent_kind,created_at").limit(5000),
    supabase.from("ai_agent_actions").select("action_type,status,created_at").limit(5000),
    supabase.from("email_delivery_events").select("template,provider,status,created_at").limit(5000),
    supabase.from("programmatic_pages").select("status,page_type,locale,created_at").limit(5000),
    supabase.from("seo_keyword_clusters").select("intent,status,locale,created_at").limit(5000),
  ]);
  const [events, sessions, users, priests, requests, proposals, bookings, payments, threads, actions, emails, pages, clusters] = results.map((result) => (result.data || []) as Row[]);

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, value: 0 }));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => ({ label: day, value: 0 }));
  const heatmap: HeatmapCell[] = [];
  const heat = new Map<string, number>();
  events.forEach((event) => {
    const date = new Date(String(event.created_at));
    hourly[date.getHours()].value += 1;
    weekdays[date.getDay()].value += 1;
    const key = `${date.getDay()}-${date.getHours()}`;
    heat.set(key, (heat.get(key) || 0) + 1);
  });
  weekdays.forEach((day, dayIndex) => Array.from({ length: 24 }, (_, hour) => heatmap.push({ day: day.label, hour, value: heat.get(`${dayIndex}-${hour}`) || 0 })));

  const signedIn = events.filter((event) => Boolean(event.user_id)).length;
  const modules: AnalyticsModule[] = [
    makeModule("Top screens", "Screen views by product route", "composed", countBy(events, "route").slice(0, 10)),
    makeModule("Client platforms", "Web and native telemetry share", "donut", countBy(events, "platform")),
    makeModule("Hourly activity", "When customers and priests use the product", "area", hourly),
    makeModule("Weekly rhythm", "Screen activity by weekday", "radar", weekdays),
    makeModule("Event volume", "Daily product events over 30 days", "line", dated(events)),
    makeModule("Known vs anonymous", "Authentication state on captured events", "radial", [{ label: "Signed in", value: signedIn }, { label: "Anonymous", value: events.length - signedIn }]),
    makeModule("Account roles", "Current customer and operator mix", "donut", countBy(users, "role")),
    makeModule("Account health", "Active and suspended accounts", "donut", [{ label: "Active", value: users.filter((user) => user.is_active).length }, { label: "Suspended", value: users.filter((user) => !user.is_active).length }]),
    makeModule("Account growth", "New accounts created each day", "area", dated(users)),
    makeModule("Priest verification", "Provider review pipeline", "donut", countBy(priests, "verification_status")),
    makeModule("Priest languages", "Languages supplied by provider profiles", "bar", arrayCount(priests, "languages").slice(0, 10)),
    makeModule("Service coverage", "Areas served by registered priests", "treemap", arrayCount(priests, "service_areas").slice(0, 10)),
    makeModule("Puja specialties", "Provider supply by ceremony category", "bar", arrayCount(priests, "pooja_slugs").slice(0, 10)),
    makeModule("Rating distribution", "Marketplace quality bands", "bar", bands(priests, "rating", [["Unrated", 0, 0], ["1-2", 0.1, 2.99], ["3-4", 3, 4.49], ["4.5-5", 4.5, 5]])),
    makeModule("Experience bands", "Provider tenure in years", "bar", bands(priests, "years_experience", [["0-2", 0, 2], ["3-5", 3, 5], ["6-10", 6, 10], ["11+", 11, 100]])),
    makeModule("Starting prices", "Provider entry price distribution", "scatter", bands(priests, "starting_price_inr", [["<1k", 0, 999], ["1k-2.5k", 1000, 2500], ["2.5k-5k", 2501, 5000], ["5k+", 5001, 1000000]])),
    makeModule("Request status", "Ceremony request pipeline", "funnel", countBy(requests, "status")),
    makeModule("Request demand", "Requested ceremony categories", "bar", countBy(requests, "pooja_slug").slice(0, 10)),
    makeModule("Customer budgets", "Maximum request budget bands", "bar", bands(requests, "budget_max_inr", [["<2.5k", 0, 2499], ["2.5k-5k", 2500, 5000], ["5k-10k", 5001, 10000], ["10k+", 10001, 1000000]])),
    makeModule("Proposal status", "Priest bid lifecycle", "funnel", countBy(proposals, "status")),
    makeModule("Proposal prices", "Submitted bid value bands", "bar", bands(proposals, "amount_inr", [["<2.5k", 0, 2499], ["2.5k-5k", 2500, 5000], ["5k-10k", 5001, 10000], ["10k+", 10001, 1000000]])),
    makeModule("Booking status", "Direct and awarded booking outcomes", "radial", countBy(bookings, "status")),
    makeModule("Booking payments", "Payment state across bookings", "donut", countBy(bookings, "payment_status")),
    makeModule("Booking demand", "Confirmed demand by puja", "bar", countBy(bookings, "pooja_slug").slice(0, 10)),
    makeModule("Payment review", "Uploaded payment evidence status", "donut", countBy(payments, "status")),
    makeModule("AI intents", "What users ask ProMitra to do", "bar", countBy(threads, "last_intent").slice(0, 10)),
    makeModule("AI actions", "Agent operation types", "bar", countBy(actions, "action_type").slice(0, 10)),
    makeModule("Email delivery", "Transactional email provider outcomes", "donut", countBy(emails, "status")),
    makeModule("Content lifecycle", "Programmatic page publishing status", "donut", countBy(pages, "status")),
    makeModule("SEO search intent", "Keyword cluster intent portfolio", "bar", countBy(clusters, "intent").slice(0, 10)),
  ];

  const activeSessionCount = sessions.filter((session) => new Date().getTime() - new Date(String(session.last_seen_at)).getTime() < 15 * 60 * 1000).length;
  return { modules, heatmap, events: events.length, sessions, activeSessionCount, recentEvents: events.slice(-100).reverse() };
}

export async function getModerationData() {
  const supabase = await createClient();
  const [reports, invites] = await Promise.all([
    supabase.from("user_reports").select("id,reported_user_id,reported_by,category,details,status,resolution_note,created_at,app_users!user_reports_reported_user_id_fkey(full_name,email,role,is_active)").order("created_at", { ascending: false }).limit(100),
    supabase.from("admin_user_invites").select("id,email,full_name,role,status,error_message,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  return { reports: reports.data || [], invites: invites.data || [] };
}

export async function getSeoData() {
  const supabase = await createClient();
  const [clusters, pages] = await Promise.all([
    supabase.from("seo_keyword_clusters").select("*,programmatic_pages(title,slug,status)").order("updated_at", { ascending: false }),
    supabase.from("super_admin_content_overview").select("*").order("impressions_30d", { ascending: false }),
  ]);
  return { clusters: clusters.data || [], pages: pages.data || [] };
}

export async function getCashfreePaymentData() {
  const supabase = await createClient();
  const [orders, earnings, disputes, events, reports, tracking, locations] = await Promise.all([
    supabase.from("payment_orders")
      .select("id,booking_id,request_id,customer_id,priest_id,pooja_slug,environment,merchant_order_id,provider_order_id,amount_paise,currency,status,provider_status,customer_receipt_token,paid_at,verified_at,created_at,bookings(address,booking_date,booking_time,pooja_name,priest_name,customer_name,invoice_no,status,payment_status)")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("provider_earnings")
      .select("id,booking_id,payment_order_id,priest_id,gross_paise,platform_fee_paise,tax_paise,net_paise,status,available_at,released_at,created_at,priest_profiles(display_name),bookings(status,pooja_name)")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("payment_disputes")
      .select("id,payment_order_id,booking_id,customer_id,priest_id,provider_dispute_id,event_type,status,amount_paise,reason,opened_at,resolved_at,created_at")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("payment_events")
      .select("id,payment_order_id,provider_event_id,event_type,signature_valid,occurred_at,received_at")
      .order("received_at", { ascending: false }).limit(100),
    supabase.from("payment_reports")
      .select("id,payment_order_id,booking_id,customer_id,priest_id,invoice_number,amount_paise,currency,provider,provider_payment_id,paid_at,report_data,generated_at")
      .order("generated_at", { ascending: false }).limit(100),
    supabase.from("booking_tracking_sessions")
      .select("booking_id,customer_id,priest_id,status,customer_consented_at,priest_consented_at,started_at,stopped_at,expires_at,last_location_at")
      .order("updated_at", { ascending: false }).limit(100),
    supabase.from("booking_locations")
      .select("booking_id,latitude,longitude,accuracy_meters,heading_degrees,recorded_at")
      .order("recorded_at", { ascending: false }).limit(200),
  ]);
  return {
    orders: orders.data || [],
    earnings: earnings.data || [],
    disputes: disputes.data || [],
    events: events.data || [],
    reports: reports.data || [],
    tracking: tracking.data || [],
    locations: locations.data || [],
  };
}

export async function getPlatformSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*");
  const settingsMap: Record<string, string> = {};
  for (const item of data || []) {
    settingsMap[item.key] = item.value;
  }
  return {
    settings: data || [],
    serviceFeePercent: Number(settingsMap["payment_service_fee_percent"] || 10),
  };
}
