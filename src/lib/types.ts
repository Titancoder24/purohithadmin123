export type DailyMetric = {
  day: string;
  active_users: number;
  sessions: number;
  bookings_created: number;
  poojas_completed: number;
  priests_joined: number;
};

export type FeatureMetric = {
  event_name: string;
  total_events: number;
  unique_users: number;
  unique_sessions: number;
  last_used_at: string;
};

export type ChartDatum = { label: string; value: number; secondary?: number };

export type AnalyticsModule = {
  title: string;
  description: string;
  type: "bar" | "line" | "area" | "donut" | "radial" | "radar" | "scatter" | "funnel" | "composed" | "treemap";
  data: ChartDatum[];
  valueLabel?: string;
};

export type HeatmapCell = { day: string; hour: number; value: number };

export type Pooja = {
  id: string;
  slug: string;
  name: string;
  kannada_name: string;
  description: string;
  duration_minutes: number;
  base_price_inr: number;
  image_url: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_active: boolean;
  updated_at: string;
};

export type ProgrammaticPage = {
  id: string;
  slug: string;
  page_type: string;
  title: string;
  locale: string;
  status: string;
  updated_at: string;
  impressions_30d?: number;
  clicks_30d?: number;
  conversions_30d?: number;
};
