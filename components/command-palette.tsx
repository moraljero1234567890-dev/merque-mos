"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornerDownLeft,
  Moon,
  Plus,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { ALL_NAV } from "./nav";
import { useTheme } from "./theme";
import { useMos } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data, isAdmin } = useMos();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    const nav: Cmd[] = ALL_NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => ({
      id: `nav-${n.href}`,
      label: n.label,
      group: "Navegar",
      icon: n.icon,
      run: go(n.href),
    }));

    const actions: Cmd[] = [
      { id: "new-task", label: "Nueva tarea", group: "Acciones", icon: Plus, run: go("/tasks?new=1") },
      { id: "new-project", label: "Nuevo proyecto", group: "Acciones", icon: Plus, run: go("/projects?new=1") },
      { id: "new-meeting", label: "Registrar reunión", group: "Acciones", icon: Plus, run: go("/meetings?new=1") },
      {
        id: "theme",
        label: theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
        group: "Acciones",
        icon: theme === "dark" ? Sun : Moon,
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onClose();
        },
      },
    ];

    const q = query.toLowerCase().trim();
    const search: Cmd[] = q
      ? [
          ...data.projects
            .filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 4)
            .map((p) => ({
              id: `p-${p.id}`,
              label: p.name,
              hint: "Proyecto",
              group: "Resultados",
              icon: ArrowRight,
              run: go(`/projects?id=${p.id}`),
            })),
          ...data.tasks
            .filter((t) => t.title.toLowerCase().includes(q))
            .slice(0, 5)
            .map((t) => ({
              id: `t-${t.id}`,
              label: t.title,
              hint: "Tarea",
              group: "Resultados",
              icon: ArrowRight,
              run: go(`/tasks?id=${t.id}`),
            })),
          ...data.profiles
            .filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 3)
            .map((p) => ({
              id: `u-${p.id}`,
              label: p.name,
              hint: p.title,
              group: "Personas",
              icon: ArrowRight,
              run: go(`/admin?user=${p.id}`),
            })),
        ]
      : [];

    const all = [...search, ...nav, ...actions];
    if (!q) return all;
    return all.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [query, data, isAdmin, router, onClose, theme, setTheme]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, commands.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        commands[active]?.run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, commands, active, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Preserve group ordering as commands appear.
  const groups: { name: string; items: { cmd: Cmd; index: number }[] }[] = [];
  commands.forEach((cmd, index) => {
    let g = groups.find((x) => x.name === cmd.group);
    if (!g) {
      g = { name: cmd.group, items: [] };
      groups.push(g);
    }
    g.items.push({ cmd, index });
  });

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-overlay-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-scale-in relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-elevated shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca o escribe un comando…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {commands.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">Sin resultados para “{query}”</div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {g.name}
              </div>
              {g.items.map(({ cmd, index }) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => cmd.run()}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active === index ? "bg-muted text-foreground" : "text-foreground/80",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.hint && <span className="text-xs text-muted-foreground">{cmd.hint}</span>}
                    {active === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
