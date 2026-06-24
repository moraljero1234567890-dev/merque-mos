import type {
  Frequency,
  KpiCategory,
  Priority,
  ProjectStatus,
  TaskStatus,
} from "./types";

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; order: number }
> = {
  backlog: { label: "Backlog", dot: "var(--muted-foreground)", order: 0 },
  todo: { label: "To Do", dot: "var(--info)", order: 1 },
  in_progress: { label: "In Progress", dot: "var(--warning)", order: 2 },
  waiting: { label: "Waiting", dot: "var(--danger)", order: 3 },
  done: { label: "Done", dot: "var(--success)", order: 4 },
};

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: string }
> = {
  planning: { label: "Planning", tone: "info" },
  active: { label: "Active", tone: "success" },
  on_hold: { label: "On hold", tone: "warning" },
  completed: { label: "Completed", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; tone: string; rank: number }
> = {
  urgent: { label: "Urgent", tone: "danger", rank: 3 },
  high: { label: "High", tone: "warning", rank: 2 },
  medium: { label: "Medium", tone: "info", rank: 1 },
  low: { label: "Low", tone: "muted", rank: 0 },
};

export const FREQUENCY_META: Record<Frequency, { label: string }> = {
  daily: { label: "Daily" },
  weekly: { label: "Weekly" },
  biweekly: { label: "Biweekly" },
  monthly: { label: "Monthly" },
  quarterly: { label: "Quarterly" },
  semiannual: { label: "Semiannual" },
  yearly: { label: "Yearly" },
};

export const KPI_CATEGORY_META: Record<
  KpiCategory,
  { label: string; tone: string }
> = {
  marketing: { label: "Marketing", tone: "info" },
  cx: { label: "Customer Experience", tone: "success" },
  operations: { label: "Operations", tone: "warning" },
};
