import type { LucideIcon } from "lucide-react";

export function Kpi({ label, value, detail, icon: Icon, tone = "ink" }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone?: "ink" | "orange" | "green" }) {
  return <article className="kpi"><div className={`kpi-icon ${tone}`}><Icon size={18}/></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}

