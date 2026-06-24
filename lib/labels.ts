import type {
  Department,
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
  backlog: { label: "En cola", dot: "var(--muted-foreground)", order: 0 },
  todo: { label: "Por hacer", dot: "var(--info)", order: 1 },
  in_progress: { label: "En progreso", dot: "var(--warning)", order: 2 },
  waiting: { label: "En espera", dot: "var(--danger)", order: 3 },
  done: { label: "Hecho", dot: "var(--success)", order: 4 },
};

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: string }
> = {
  planning: { label: "Planeación", tone: "info" },
  active: { label: "Activo", tone: "success" },
  on_hold: { label: "En pausa", tone: "warning" },
  completed: { label: "Completado", tone: "muted" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; tone: string; rank: number }
> = {
  urgent: { label: "Urgente", tone: "danger", rank: 3 },
  high: { label: "Alta", tone: "warning", rank: 2 },
  medium: { label: "Media", tone: "info", rank: 1 },
  low: { label: "Baja", tone: "muted", rank: 0 },
};

export const FREQUENCY_META: Record<Frequency, { label: string }> = {
  daily: { label: "Diario" },
  weekly: { label: "Semanal" },
  biweekly: { label: "Quincenal" },
  monthly: { label: "Mensual" },
  quarterly: { label: "Trimestral" },
  semiannual: { label: "Semestral" },
  yearly: { label: "Anual" },
};

export const KPI_CATEGORY_META: Record<
  KpiCategory,
  { label: string; tone: string }
> = {
  marketing: { label: "Marketing", tone: "info" },
  cx: { label: "Experiencia Cliente", tone: "success" },
  operations: { label: "Operaciones", tone: "warning" },
};

// Spanish display labels for the (internal, English) department enum values.
export const DEPARTMENT_META: Record<Department, { label: string }> = {
  Brand: { label: "Marca" },
  Content: { label: "Contenido" },
  Performance: { label: "Performance" },
  CRM: { label: "CRM" },
  "Retail Marketing": { label: "Trade Marketing" },
  Analytics: { label: "Analítica" },
};

export const deptLabel = (d: Department) => DEPARTMENT_META[d]?.label ?? d;
