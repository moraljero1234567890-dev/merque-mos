"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Check, ChevronDown, Menu, Search } from "lucide-react";
import { ALL_NAV } from "./nav";
import { ThemeToggle } from "./theme";
import { useMos } from "@/lib/store";
import { Avatar, Badge, Kbd } from "./ui";
import { cn } from "@/lib/utils";

function useTitle() {
  const pathname = usePathname();
  const item = ALL_NAV.find((n) => pathname.startsWith(n.href));
  return item?.label ?? "Panel";
}

export function Topbar({
  onMenu,
  onSearch,
}: {
  onMenu: () => void;
  onSearch: () => void;
}) {
  const title = useTitle();
  const { data, me, currentUserId, setCurrentUserId, markAllNotificationsRead } = useMos();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const notifs = data.notifications.filter((n) => n.userId === me.id);
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>

      <button
        onClick={onSearch}
        className="group ml-auto flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="hidden flex-1 text-left sm:inline">Buscar…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <ThemeToggle />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => {
            setNotifOpen((o) => !o);
            setUserOpen(false);
          }}
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />
          )}
        </button>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div className="animate-scale-in absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-elevated shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Notificaciones</span>
                {unread > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Marcar todo como leído
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">Estás al día.</div>
                )}
                {notifs.map((n) => (
                  <div key={n.id} className="flex gap-3 border-b border-border px-4 py-3 last:border-0">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-border" : "bg-primary")} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User / role switcher (demo) */}
      <div className="relative">
        <button
          onClick={() => {
            setUserOpen((o) => !o);
            setNotifOpen(false);
          }}
          className="flex items-center gap-1.5 rounded-lg p-0.5 pl-0.5 transition-colors hover:bg-muted"
        >
          <Avatar id={me.id} name={me.name} size={30} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {userOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
            <div className="animate-scale-in absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-elevated shadow-xl">
              <div className="border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Viendo como</span>
                  <Badge tone={me.role === "admin" ? "primary" : "muted"}>{me.role}</Badge>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {data.profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentUserId(p.id);
                      setUserOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <Avatar id={p.id} name={p.name} size={28} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.title}</div>
                    </div>
                    {p.id === currentUserId && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
