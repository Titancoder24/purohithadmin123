import { requireAdmin } from "@/lib/auth";
import { consoleThemeStyle } from "@/lib/appearance";
import { getAdminConsoleTheme } from "@/lib/data";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const theme = await getAdminConsoleTheme(admin.id);
  return <div className="console-shell" style={theme ? consoleThemeStyle(theme) : undefined}><Sidebar/><div className="console-main"><Header admin={admin}/><main className="content">{children}</main></div></div>;
}

