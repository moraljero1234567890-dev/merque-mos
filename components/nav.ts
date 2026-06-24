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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "P" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, shortcut: "T" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, shortcut: "C" },
  { label: "Recurring Work", href: "/recurring", icon: Repeat, shortcut: "R" },
  { label: "KPIs", href: "/kpis", icon: Target, shortcut: "K" },
  { label: "Meetings", href: "/meetings", icon: Users, shortcut: "M" },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];
