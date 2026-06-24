import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Repeat,
  Settings,
  Shield,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  shortcut?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { label: "Proyectos", href: "/projects", icon: FolderKanban, shortcut: "P" },
  { label: "Tareas", href: "/tasks", icon: CheckSquare, shortcut: "T" },
  { label: "Calendario", href: "/calendar", icon: CalendarDays, shortcut: "C" },
  { label: "Trabajo recurrente", href: "/recurring", icon: Repeat, shortcut: "R" },
  { label: "KPIs", href: "/kpis", icon: Target, shortcut: "K" },
  { label: "Reuniones", href: "/meetings", icon: Users, shortcut: "M" },
  { label: "Documentos", href: "/documents", icon: FileText },
  { label: "Finanzas", href: "/finance", icon: Wallet, adminOnly: true },
  { label: "Reportes", href: "/reports", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Administración", href: "/admin", icon: Shield, adminOnly: true },
  { label: "Configuración", href: "/settings", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];
