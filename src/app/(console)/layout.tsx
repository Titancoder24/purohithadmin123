import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <div className="console-shell"><Sidebar/><div className="console-main"><Header admin={admin}/><main className="content">{children}</main></div></div>;
}

