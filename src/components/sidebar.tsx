"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccounts } from "@/hooks/useAccounts";
import { useStorageStore } from "@/stores/storageStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { formatBytes } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  Files,
  Share2,
  Trash2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/files", icon: Files, label: "Files" },
  { href: "/dashboard/shared", icon: Share2, label: "Shared with Me" },
  { href: "/dashboard/trash", icon: Trash2, label: "Trash" },
  { href: "/dashboard/stats", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { accounts } = useAccounts();
  const { quotas } = useStorageStore();
  const { collapsed, toggleCollapsed } = useSidebarStore();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Cloud className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="ml-2 text-lg font-bold">OneStopG</span>
        )}
        <button
          onClick={toggleCollapsed}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Account Storage */}
      {!collapsed && accounts.length > 0 && (
        <div className="border-t border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Accounts
          </p>
          {accounts.map((account) => {
            const quota = quotas.find((q) => q.email === account.email);
            const used = quota?.used ?? account.storageQuota.used;
            const limit = quota?.limit ?? account.storageQuota.limit;
            const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

            return (
              <div key={account.email} className="space-y-1">
                <p className="text-xs text-foreground truncate">
                  {account.email}
                </p>
                <Progress value={percent} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(used)} / {formatBytes(limit)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
