import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "oklch(0.62 0.19 277)",
  "oklch(0.64 0.17 150)",
  "oklch(0.7 0.16 70)",
  "oklch(0.62 0.2 25)",
  "oklch(0.64 0.14 230)",
  "oklch(0.6 0.18 330)",
  "oklch(0.62 0.16 190)",
  "oklch(0.66 0.17 50)",
];

export function colorFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function uid(prefix = "id") {
  // Real UUIDs so client-created rows are insertable into Supabase uuid columns.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback (older environments).
  return `${prefix}_${Date.now().toString(36)}${(performance.now() | 0).toString(36)}`;
}
