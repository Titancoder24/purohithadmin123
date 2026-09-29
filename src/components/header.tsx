import { Bell, ChevronDown, Search } from "lucide-react";
import type { AdminIdentity } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export function Header({ admin }: { admin: AdminIdentity }) {
  const initials = admin.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <header className="topbar">
    <div className="command-search"><Search size={17}/><span>Search users, requests, content</span><kbd>⌘ K</kbd></div>
    <div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><form action={logout}><button className="account-button"><span className="avatar">{initials}</span><span className="account-copy"><strong>{admin.fullName}</strong><small>{admin.role.replace("_", " ")}</small></span><ChevronDown size={15}/></button></form></div>
  </header>;
}

