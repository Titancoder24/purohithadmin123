"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DailyPoint = { label: string; created: number; opened: number };
type TypePoint = { label: string; value: number };
const tooltip = { border: "1px solid #e6e1da", borderRadius: 9, boxShadow: "0 12px 30px rgba(36,28,21,.1)", fontSize: 10 };

export function NotificationTrendChart({ data }: { data: DailyPoint[] }) {
  return <div className="notification-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="notificationCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6531a" stopOpacity={.28}/><stop offset="1" stopColor="#e6531a" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#eee9e3"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#847d76", fontSize: 9 }}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#847d76", fontSize: 9 }}/><Tooltip contentStyle={tooltip}/><Area name="Created" dataKey="created" type="monotone" stroke="#e6531a" strokeWidth={2.4} fill="url(#notificationCreated)"/><Area name="Opened" dataKey="opened" type="monotone" stroke="#702d1f" strokeWidth={2.2} fill="transparent"/></AreaChart></ResponsiveContainer></div>;
}

export function NotificationTypeChart({ data }: { data: TypePoint[] }) {
  return <div className="notification-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 18, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#eee9e3"/><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#847d76", fontSize: 9 }}/><YAxis type="category" dataKey="label" width={104} axisLine={false} tickLine={false} tick={{ fill: "#625a54", fontSize: 9 }}/><Tooltip contentStyle={tooltip}/><Bar name="Notifications" dataKey="value" fill="#e6531a" radius={[0, 7, 7, 0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>;
}
