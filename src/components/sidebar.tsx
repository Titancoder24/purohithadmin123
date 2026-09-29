"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpenText, CalendarDays, CreditCard, FileText, Gauge, Languages, MapPinned, MonitorSmartphone, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, UsersRound } from "lucide-react";

const sections = [
  { label: "Operate", items: [
    { href: "/", label: "Overview", icon: Gauge },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/sessions", label: "Sessions", icon: MonitorSmartphone },
    { href: "/users", label: "Customers", icon: UsersRound },
    { href: "/priests", label: "Priests", icon: ShieldCheck },
    { href: "/payments", label: "Payments", icon: CreditCard },
  ]},
  { label: "Publish", items: [
    { href: "/content/poojas", label: "Puja catalog", icon: CalendarDays },
    { href: "/content/pages", label: "Content", icon: FileText },
    { href: "/seo", label: "Search growth", icon: Search },
    { href: "/seo/locations", label: "Location pages", icon: MapPinned },
    { href: "/settings", label: "Configuration", icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function toggleSidebar() {
    setCollapsed((current) => !current);
  }

  return <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
    <div className="sidebar-head"><div className="brand"><span className="brand-logo"><Image src="/purohithconnect-logo.png" alt="Purohith Connect" width={42} height={42} priority/></span><span className="brand-copy"><strong>Purohith Connect</strong><small>Command center</small></span></div><button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button></div>
    <nav className="nav-groups">
      {sections.map((section) => <div key={section.label} className="nav-group"><p>{section.label}</p>{section.items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" || href === "/seo" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} title={collapsed ? label : undefined}><Icon size={18}/><span>{label}</span>{active && <i className="active-rail"/>}</Link>;
      })}</div>)}
    </nav>
    <div className="sidebar-foot"><BookOpenText size={17}/><span>Production workspace</span><Languages size={16}/></div>
  </aside>;
}
