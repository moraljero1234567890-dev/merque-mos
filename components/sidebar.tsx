"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChevronsLeft } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav";
import { useMos } from "@/lib/store";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { me, isAdmin, data } = useMos();

  const openTasks = data.tasks.filter(
    (t) => t.assigneeId === me.id && t.status !== "done",
  ).length;

  const counts: Record<string, number> = { "/tasks": openTasks };

  const renderItem = (item: (typeof PRIMARY_NAV)[number]) => {
    if (item.adminOnly && !isAdmin) return null;
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    const count = counts[item.href];
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
        )}
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
        <span className="flex-1 truncate">{item.label}</span>
        {count ? (
          <span className="rounded-full bg-border px-1.5 text-[11px] font-semibold text-muted-foreground">
            {count}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Boxes className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Merqueo MOS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Marketing OS</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {PRIMARY_NAV.map(renderItem)}
        <div className="my-3 h-px bg-border" />
        {SECONDARY_NAV.map(renderItem)}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted"
        >
          <Avatar id={me.id} name={me.name} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{me.name}</div>
            <div className="truncate text-xs text-muted-foreground">{me.title}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <SidebarContent />
      {onCollapse && (
        <button onClick={onCollapse} className="hidden">
          <ChevronsLeft />
        </button>
      )}
    </aside>
  );
}
