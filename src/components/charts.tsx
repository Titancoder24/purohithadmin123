"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Funnel, FunnelChart, LabelList, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import type { AnalyticsModule, DailyMetric, HeatmapCell } from "@/lib/types";

const tooltipStyle = { border: "1px solid #e6e1da", borderRadius: 8, boxShadow: "0 10px 30px rgba(36,28,21,.08)", fontSize: 11 };
const monoTooltipStyle = { border: "1px solid #eadfd9", borderRadius: 8, background: "#fff", color: "#702d1f", boxShadow: "0 14px 35px rgba(73,38,25,.14)", fontSize: 10 };
const chartColors = ["#e6531a", "#702d1f", "#c88362", "#e9b39c"];

export function ActivityChart({ data }: { data: DailyMetric[] }) {
  const values = data.map((item) => ({ ...item, label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.day)) }));
  if (!values.length) return <div className="empty-chart"><strong>No session data yet</strong><span>Activity appears after the Expo and web clients send session heartbeats.</span></div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={values} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e44b14" stopOpacity={0.24}/><stop offset="100%" stopColor="#e44b14" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#ece9e4"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#78746e", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#78746e", fontSize: 11 }}/><Tooltip contentStyle={tooltipStyle}/><Area type="monotone" dataKey="active_users" name="Active users" stroke="#e44b14" strokeWidth={2.5} fill="url(#activeFill)"/><Area type="monotone" dataKey="bookings_created" name="Requests" stroke="#171513" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div>;
}

export function AnalyticsChart({ module }: { module: AnalyticsModule }) {
  const [mode, setMode] = useState<"count" | "share">("count");
  const source = module.data.filter((item) => item.value > 0);
  const total = source.reduce((sum, item) => sum + item.value, 0);
  const data = useMemo(() => source.map((item, index) => ({
    ...item,
    index: index + 1,
    rawValue: item.value,
    value: mode === "share" && total ? Number(((item.value / total) * 100).toFixed(1)) : item.value,
    secondary: source.slice(Math.max(0, index - 2), index + 1).reduce((sum, point) => sum + point.value, 0) / Math.min(index + 1, 3),
  })), [mode, source, total]);
  if (!data.length) return <div className="mini-chart-empty"><strong>No data yet</strong><span>This module will populate from production events.</span></div>;
  const common = <><CartesianGrid vertical={false} stroke="#eee3dd" strokeDasharray="3 3"/><XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: "#887971", fontSize: 9 }}/><YAxis axisLine={false} tickLine={false} allowDecimals={false} width={30} tick={{ fill: "#887971", fontSize: 9 }}/><Tooltip contentStyle={monoTooltipStyle} formatter={(value) => [`${value}${mode === "share" ? "%" : ""}`, mode === "share" ? "Share" : "Count"]}/></>;
  let chart: React.ReactNode;
  if (module.type === "donut") chart = <><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={3} cornerRadius={7} stroke="none">{data.map((item, index) => <Cell key={item.label} fill={chartColors[index % chartColors.length]}/>)}</Pie><Tooltip contentStyle={monoTooltipStyle}/></PieChart></ResponsiveContainer><div className="chart-key mono-key">{data.slice(0, 4).map((item, index) => <span key={item.label}><i style={{ background: chartColors[index % chartColors.length] }}/>{item.label} <b>{item.value}{mode === "share" ? "%" : ""}</b></span>)}</div></>;
  else if (module.type === "radial") chart = <ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="28%" outerRadius="92%" data={data} startAngle={90} endAngle={-270}><RadialBar dataKey="value" cornerRadius={9} background={{ fill: "#f4e9e4" }}>{data.map((item, index) => <Cell key={item.label} fill={chartColors[index % chartColors.length]}/>)}</RadialBar><Tooltip contentStyle={monoTooltipStyle}/></RadialBarChart></ResponsiveContainer>;
  else if (module.type === "radar") chart = <ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="70%"><PolarGrid stroke="#eadfd9"/><PolarAngleAxis dataKey="label" tick={{ fill: "#887971", fontSize: 9 }}/><Radar dataKey="value" stroke="#e6531a" strokeWidth={2} fill="#e6531a" fillOpacity={.16}/><Tooltip contentStyle={monoTooltipStyle}/></RadarChart></ResponsiveContainer>;
  else if (module.type === "scatter") chart = <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 12, left: -12, bottom: 0 }}><CartesianGrid stroke="#eee3dd" strokeDasharray="3 3"/><XAxis type="number" dataKey="index" tick={{ fill: "#887971", fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis type="number" dataKey="value" tick={{ fill: "#887971", fontSize: 9 }} axisLine={false} tickLine={false}/><Scatter data={data} fill="#e6531a"/><Tooltip contentStyle={monoTooltipStyle} cursor={{ strokeDasharray: "3 3" }}/></ScatterChart></ResponsiveContainer>;
  else if (module.type === "funnel") chart = <ResponsiveContainer width="100%" height="100%"><FunnelChart><Tooltip contentStyle={monoTooltipStyle}/><Funnel data={data} dataKey="value" nameKey="label" fill="#e6531a" stroke="#fff" isAnimationActive><LabelList position="right" dataKey="label" fill="#766a64" fontSize={9}/></Funnel></FunnelChart></ResponsiveContainer>;
  else if (module.type === "treemap") chart = <ResponsiveContainer width="100%" height="100%"><Treemap data={data} dataKey="value" nameKey="label" aspectRatio={4 / 3} stroke="#fff" fill="#c88362"><Tooltip contentStyle={monoTooltipStyle}/></Treemap></ResponsiveContainer>;
  else if (module.type === "composed") chart = <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 8, right: 5, bottom: 2, left: -8 }}>{common}<Bar dataKey="value" fill="#e9b39c" radius={[8, 8, 8, 8]} maxBarSize={16}/><Line dataKey="secondary" type="monotone" stroke="#702d1f" strokeWidth={2.3} dot={false}/></ComposedChart></ResponsiveContainer>;
  else if (module.type === "bar") chart = <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 4, bottom: 2, left: -8 }}>{common}<Bar dataKey="value" fill="#e6531a" radius={[8, 8, 8, 8]} maxBarSize={18}/></BarChart></ResponsiveContainer>;
  else if (module.type === "line") chart = <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 5, bottom: 2, left: -8 }}>{common}<Line dataKey="value" type="monotone" stroke="#e6531a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={{ r: 3, fill: "#fff", stroke: "#702d1f", strokeWidth: 2 }}/></LineChart></ResponsiveContainer>;
  const id = `fill-${module.title.replaceAll(" ", "-").toLowerCase()}`;
  if (!chart) chart = <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 5, bottom: 2, left: -8 }}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6531a" stopOpacity={.28}/><stop offset="1" stopColor="#e6531a" stopOpacity={0}/></linearGradient></defs>{common}<Area dataKey="value" type="monotone" stroke="#e6531a" strokeWidth={2.4} strokeLinecap="round" fill={`url(#${id})`}/></AreaChart></ResponsiveContainer>;
  return <div className="mini-chart"><div className="chart-mode" aria-label="Chart value mode"><button className={mode === "count" ? "active" : ""} onClick={() => setMode("count")}>Count</button><button className={mode === "share" ? "active" : ""} onClick={() => setMode("share")}>Share</button></div><div className="mono-chart-stage">{chart}</div></div>;
}

export function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  const max = Math.max(1, ...data.map((cell) => cell.value));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return <div className="heatmap"><div className="heatmap-hours"><span/>{[0, 4, 8, 12, 16, 20].map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}</div>{days.map((day) => <div className="heatmap-row" key={day}><strong>{day}</strong>{data.filter((cell) => cell.day === day).map((cell) => <i key={cell.hour} title={`${day} ${cell.hour}:00 · ${cell.value} events`} style={{ opacity: .08 + (cell.value / max) * .92 }}/>)}</div>)}</div>;
}
