"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarCheck2, Database, LoaderCircle, MousePointerClick, Route } from "lucide-react";
import { ActivityHeatmap, AnalyticsChart } from "@/components/charts";
import { Kpi } from "@/components/kpi";
import type { AnalyticsModule, HeatmapCell } from "@/lib/types";

const PREVIEW_SECONDS = 12;
const fallbackLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function previewModule(module: AnalyticsModule, moduleIndex: number): AnalyticsModule {
  const labels = module.data.length ? module.data.slice(0, 8).map((point) => point.label) : fallbackLabels;
  const seed = [...module.title].reduce((sum, character) => sum + character.charCodeAt(0), 0) + moduleIndex * 19;
  return {
    ...module,
    data: labels.map((item, index) => ({ label: item, value: 18 + ((seed + index * 31 + index * index * 7) % 76) })),
  };
}

function previewHeatmap(): HeatmapCell[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].flatMap((day, dayIndex) =>
    Array.from({ length: 24 }, (_, hour) => ({ day, hour, value: 1 + ((dayIndex * 13 + hour * 7 + hour * dayIndex) % 18) })),
  );
}

type ActiveMetrics = {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
};

export function LiveAnalyticsReport({ modules, heatmap, active, events }: { modules: AnalyticsModule[]; heatmap: HeatmapCell[]; active: ActiveMetrics; events: number }) {
  const [preview, setPreview] = useState(true);
  const [seconds, setSeconds] = useState(PREVIEW_SECONDS);
  const previewModules = useMemo(() => modules.map(previewModule), [modules]);
  const sampleHeatmap = useMemo(() => previewHeatmap(), []);

  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    const timeout = window.setTimeout(() => setPreview(false), PREVIEW_SECONDS * 1000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, []);

  const displayed = preview ? previewModules : modules;
  const displayedActive = preview ? { daily_active_users: 184, weekly_active_users: 926, monthly_active_users: 2847 } : active;
  const liveModules = modules.filter((item) => item.data.some((point) => point.value > 0)).length;
  return <>
    <section className={`kpi-grid ${preview ? "is-preview" : "is-live"}`}>
      <Kpi label="Daily active users" value={displayedActive.daily_active_users} detail={preview ? "Demonstration value - live data follows" : "Identified users in the last 24 hours"} icon={Activity} tone="orange"/>
      <Kpi label="Weekly active users" value={displayedActive.weekly_active_users} detail={preview ? "Demonstration value - live data follows" : "Identified users in the last seven days"} icon={CalendarCheck2}/>
      <Kpi label="Monthly active users" value={displayedActive.monthly_active_users} detail={preview ? "Demonstration value - live data follows" : "Identified users in the last 30 days"} icon={Route} tone="green"/>
      <Kpi label="Telemetry coverage" value={preview ? "30/30" : `${liveModules}/30`} detail={preview ? "All reporting modules populated for preview" : `${events} events currently available`} icon={MousePointerClick}/>
    </section>
    <div className={`analytics-feed-state ${preview ? "preview" : "live"}`} role="status" aria-live="polite">
      <span className="feed-state-icon">{preview ? <LoaderCircle size={15}/> : <Database size={15}/>}</span>
      <span><strong>{preview ? "Demo analytics" : "Live Supabase data"}</strong><small>{preview ? `Showing demonstration values for visual validation · live values in ${seconds} seconds` : "Connected to fvvmfrbfqwdypkagtdce · no demonstration values remain"}</small></span>
      <i><b style={{ width: preview ? `${((PREVIEW_SECONDS - seconds) / PREVIEW_SECONDS) * 100}%` : "100%" }}/></i>
    </div>
    <section className="panel heatmap-panel"><div className="panel-heading"><div><p className="eyebrow">Behavior map</p><h2>Feature activity by day and hour</h2></div><span>{preview ? "Sample rendering" : "Live screen events"}</span></div><ActivityHeatmap data={preview ? sampleHeatmap : heatmap}/></section>
    <section className={`analytics-grid ${preview ? "is-preview" : "is-live"}`}>{displayed.map((item, index) => <article className="analytics-card" key={item.title}><div className="analytics-card-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{item.title}</h2><p>{item.description}</p></div><b className={`data-origin ${preview ? "sample" : "live"}`}>{preview ? "Sample" : "Live"}</b></div><AnalyticsChart module={item}/></article>)}</section>
  </>;
}
