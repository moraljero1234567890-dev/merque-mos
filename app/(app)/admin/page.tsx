"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  CheckCircle2,
  FolderKanban,
  Gauge as GaugeIcon,
  LayoutGrid,
  Pencil,
  Plus,
  Shield,
  Timer,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { BUDGET_CATEGORIES, DEPARTMENTS, TASK_STATUSES } from "@/lib/types";
import type { BudgetLine, Department, KpiCategory } from "@/lib/types";
import { TASK_STATUS_META, KPI_CATEGORY_META, deptLabel } from "@/lib/labels";
import {
  capacityUtilization,
  completionRate,
  isOverdue,
  loggedHours,
  onTimeRate,
  openTasksFor,
  plannedHours,
  projectHealth,
  HEALTH_META,
} from "@/lib/selectors";
import { PageHeader } from "@/components/page-header";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Progress,
  Ring,
  Select,
} from "@/components/ui";
import { BarsByCategory, DonutChart } from "@/components/charts";
import { cn, formatMoney } from "@/lib/utils";

type Tab = "overview" | "team" | "workload" | "projects" | "budget" | "activity";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Resumen", icon: LayoutGrid },
  { key: "team", label: "Equipo", icon: Users },
  { key: "workload", label: "Carga", icon: GaugeIcon },
  { key: "projects", label: "Proyectos", icon: FolderKanban },
  { key: "budget", label: "Presupuesto", icon: Wallet },
  { key: "activity", label: "Actividad", icon: Activity },
];

function utilTone(util: number) {
  const tone = util > 100 ? "danger" : util > 80 ? "warning" : "success";
  const color =
    tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--success)";
  return { tone, color };
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminInner />
    </Suspense>
  );
}

function AdminInner() {
  const params = useSearchParams();
  const { isAdmin } = useMos();
  const [tab, setTab] = useState<Tab>("overview");
  const focusUser = params.get("user");

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Administración"
          description="Desempeño del equipo, carga de trabajo, salud de proyectos y el scorecard del departamento."
        />
        <EmptyState
          icon={<Shield className="h-5 w-5" />}
          title="Solo administradores"
          description="Este panel está restringido a administradores. Cambia a un usuario administrador desde el menú del avatar en la esquina superior derecha para gestionar el departamento."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Administración"
        description="Desempeño del equipo, carga de trabajo, salud de proyectos y el scorecard del departamento."
      />

      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "team" && <Team focusUser={focusUser} />}
      {tab === "workload" && <Workload />}
      {tab === "projects" && <ProjectHealth />}
      {tab === "budget" && <BudgetTab />}
      {tab === "activity" && <ActivityFeed />}
    </div>
  );
}

/* --------------------------------------------------------------- Stat card */

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone?: string;
  hint?: string;
}) {
  const toneColor: Record<string, string> = {
    danger: "text-danger bg-danger/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneColor[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/* ----------------------------------------------------------------- Overview */

function Overview() {
  const { data } = useMos();
  const teamSize = data.profiles.length;
  const activeProjects = data.projects.filter((p) => p.status === "active").length;
  const cRate = completionRate(data);
  const otRate = onTimeRate(data);

  const statusBars = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({
        name: TASK_STATUS_META[s].label,
        value: data.tasks.filter((t) => t.status === s).length,
        color: TASK_STATUS_META[s].dot,
      })),
    [data.tasks],
  );

  const deptBars = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        name: deptLabel(d),
        value: data.projects.filter((p) => p.department === d).length,
        color: "var(--primary)",
      })).filter((d) => d.value > 0),
    [data.projects],
  );

  const donut = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({
        name: TASK_STATUS_META[s].label,
        value: data.tasks.filter((t) => t.status === s).length,
        color: TASK_STATUS_META[s].dot,
      })).filter((d) => d.value > 0),
    [data.tasks],
  );

  // Department KPI attainment per category
  const categories: KpiCategory[] = ["marketing", "cx", "operations"];
  const kpiAttainment = useMemo(
    () =>
      categories.map((cat) => {
        const kpis = data.kpis.filter((k) => k.category === cat);
        const avg = kpis.length
          ? Math.round(
              kpis.reduce((s, k) => {
                const a =
                  k.direction === "up"
                    ? (k.current / Math.max(k.target, 0.001)) * 100
                    : (k.target / Math.max(k.current, 0.001)) * 100;
                return s + Math.min(a, 100);
              }, 0) / kpis.length,
            )
          : 0;
        return { cat, avg, count: kpis.length };
      }),
    [data.kpis],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tamaño del equipo" value={teamSize} icon={Users} tone="primary" />
        <StatCard label="Proyectos activos" value={activeProjects} icon={FolderKanban} tone="info" />
        <StatCard label="Tasa de finalización" value={`${cRate}%`} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Tasa a tiempo"
          value={`${otRate}%`}
          icon={Timer}
          tone={otRate >= 80 ? "success" : otRate >= 60 ? "warning" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">
              {deptBars.length ? "Proyectos por departamento" : "Tareas por estado"}
            </h2>
          </div>
          <div className="p-5">
            <BarsByCategory data={deptBars.length ? deptBars : statusBars} height={240} />
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Tareas por estado</h2>
          </div>
          <div className="p-5">
            <DonutChart data={donut} height={200} />
            <div className="mt-4 space-y-1.5">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1 text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Scorecard de KPIs del departamento</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          {kpiAttainment.map(({ cat, avg, count }) => {
            const color =
              avg >= 80 ? "var(--success)" : avg >= 50 ? "var(--warning)" : "var(--danger)";
            return (
              <div
                key={cat}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface/50 p-4"
              >
                <div className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center">
                  <Ring value={avg} size={64} stroke={6} color={color} />
                  <span className="absolute text-sm font-semibold">{avg}%</span>
                </div>
                <div>
                  <div className="text-sm font-medium">{KPI_CATEGORY_META[cat].label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    cumplimiento promedio · {count} KPI{count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------------- Team */

function Team({ focusUser }: { focusUser: string | null }) {
  const { data } = useMos();

  const rows = useMemo(
    () =>
      [...data.profiles]
        .map((p) => {
          const open = openTasksFor(data, p.id).length;
          const done = data.tasks.filter(
            (t) => t.assigneeId === p.id && t.status === "done",
          ).length;
          const overdue = data.tasks.filter(
            (t) => t.assigneeId === p.id && isOverdue(t),
          ).length;
          const util = capacityUtilization(data, p);
          return { p, open, done, overdue, util };
        })
        .sort((a, b) => b.util - a.util),
    [data],
  );

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Miembro</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Departamento</th>
              <th className="px-4 py-2.5 font-medium">Abiertas</th>
              <th className="px-4 py-2.5 font-medium">Completadas</th>
              <th className="px-4 py-2.5 font-medium">Utilización</th>
              <th className="px-4 py-2.5 font-medium">A tiempo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, open, done, overdue, util }) => {
              const { color } = utilTone(util);
              const isFocus = focusUser === p.id;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/40",
                    isFocus && "bg-primary/5 ring-1 ring-inset ring-primary",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar id={p.id} name={p.name} size={30} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge tone="muted">{deptLabel(p.department)}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{open}</td>
                  <td className="px-4 py-3 text-muted-foreground">{done}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(util, 100)}%`, background: color }}
                        />
                      </div>
                      <span className="w-9 text-xs text-muted-foreground">{util}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {overdue ? (
                      <Badge tone="danger">{overdue} vencidas</Badge>
                    ) : (
                      <Badge tone="success">A tiempo</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Workload */

function Workload() {
  const { data } = useMos();
  const rows = useMemo(
    () =>
      [...data.profiles]
        .map((m) => ({
          m,
          util: capacityUtilization(data, m),
          planned: plannedHours(data, m.id),
          logged: loggedHours(data, m.id),
        }))
        .sort((a, b) => b.util - a.util),
    [data],
  );

  const overloaded = rows.filter((r) => r.util > 100).length;
  const free = rows.filter((r) => r.util <= 80).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sobrecargados" value={overloaded} icon={GaugeIcon} tone={overloaded ? "danger" : "muted"} />
        <StatCard label="Capacidad saludable" value={free} icon={CheckCircle2} tone="success" />
        <StatCard label="Miembros del equipo" value={rows.length} icon={Users} tone="primary" />
      </div>

      <Card>
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Mapa de calor de carga</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Horas planeadas vs capacidad semanal. Las barras se vuelven ámbar sobre 80% y rojas sobre 100%.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {rows.map(({ m, util, planned, logged }) => {
            const { color, tone } = utilTone(util);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar id={m.id} name={m.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {planned}h / {m.weeklyCapacity}h
                      </span>
                      <Badge tone={tone}>{util}%</Badge>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(util, 100)}%`, background: color }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {logged}h registradas este ciclo
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ Project health */

function ProjectHealth() {
  const { data } = useMos();
  const order = { off_track: 0, at_risk: 1, on_track: 2 } as const;

  const rows = useMemo(
    () =>
      [...data.projects]
        .map((p) => ({ p, health: projectHealth(p, data.tasks) }))
        .sort((a, b) => order[a.health] - order[b.health]),
    [data.projects, data.tasks],
  );

  if (!rows.length) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-5 w-5" />}
        title="Aún no hay proyectos"
        description="Crea un proyecto para empezar a monitorear la salud en todo el departamento."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Proyecto</th>
              <th className="px-4 py-2.5 font-medium">Salud</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Responsable</th>
              <th className="px-4 py-2.5 font-medium">Progreso</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Vence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, health }) => {
              const hm = HEALTH_META[health];
              const owner = data.profiles.find((x) => x.id === p.ownerId);
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: hm.color }}
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={hm.tone}>{hm.label}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {owner && (
                      <div className="flex items-center gap-2">
                        <Avatar id={owner.id} name={owner.name} size={22} />
                        <span className="hidden text-muted-foreground lg:inline">{owner.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress} className="w-20" />
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {format(new Date(p.dueDate), "d 'de' MMM", { locale: es })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Activity */

function ActivityFeed() {
  const { data } = useMos();

  if (!data.activity.length) {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="Aún no hay actividad"
        description="Las acciones en tareas, proyectos y reuniones aparecerán aquí."
      />
    );
  }

  return (
    <Card>
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">Registro de actividad</h2>
      </div>
      <div className="p-5">
        <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {data.activity.map((a) => {
            const actor = data.profiles.find((p) => p.id === a.actorId);
            return (
              <li key={a.id} className="relative flex gap-3">
                <div className="z-10 shrink-0">
                  <Avatar id={a.actorId} name={actor?.name ?? "?"} size={32} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{actor?.name ?? "Alguien"}</span>{" "}
                    <span className="text-muted-foreground">{a.summary}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.createdAt), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Budget */

function BudgetTab() {
  const { data } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string }>({ open: false });
  const [month, setMonth] = useState("all");

  const months = useMemo(
    () => Array.from(new Set(data.budgets.map((b) => b.month))).sort().reverse(),
    [data.budgets],
  );
  const lines = useMemo(
    () => (month === "all" ? data.budgets : data.budgets.filter((b) => b.month === month)),
    [data.budgets, month],
  );

  const planned = lines.reduce((s, b) => s + b.planned, 0);
  const actual = lines.reduce((s, b) => s + b.actual, 0);
  const available = planned - actual;
  const used = planned ? Math.round((actual / planned) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, { planned: number; actual: number }>();
    for (const b of lines) {
      const cur = map.get(b.category) ?? { planned: 0, actual: 0 };
      cur.planned += b.planned;
      cur.actual += b.actual;
      map.set(b.category, cur);
    }
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.planned - a.planned);
  }, [lines]);

  const byDept = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        name: deptLabel(d),
        value: lines.filter((b) => b.department === d).reduce((s, b) => s + b.actual, 0),
        color: "var(--primary)",
      })).filter((x) => x.value > 0),
    [lines],
  );

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    return format(new Date(Number(y), Number(mo) - 1, 1), "MMM yyyy", { locale: es });
  };

  if (data.budgets.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Aún no hay presupuesto"
          description="Registra las partidas de marketing (medios, producción, eventos…) con su monto planeado y ejecutado para controlar la inversión del área."
          action={
            <Button onClick={() => setComposer({ open: true })}>
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>
          }
        />
        <BudgetComposer open={composer.open} lineId={composer.id} onClose={() => setComposer({ open: false })} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto">
          <option value="all">Todos los meses</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </Select>
        <Button onClick={() => setComposer({ open: true })}>
          <Plus className="h-4 w-4" />
          Agregar línea
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Planeado" value={formatMoney(planned)} icon={Wallet} tone="primary" />
        <StatCard label="Ejecutado" value={formatMoney(actual)} icon={CheckCircle2} tone="info" />
        <StatCard
          label="Disponible"
          value={formatMoney(available)}
          icon={Timer}
          tone={available < 0 ? "danger" : "success"}
        />
        <StatCard
          label="Ejecución"
          value={`${used}%`}
          icon={GaugeIcon}
          tone={used > 100 ? "danger" : used > 85 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {byDept.length > 0 && (
          <Card className="lg:col-span-1">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">Ejecución por área</h2>
            </div>
            <div className="p-5">
              <BarsByCategory data={byDept} height={220} />
            </div>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Planeado vs. ejecutado por categoría</h2>
          </div>
          <div className="space-y-4 p-5">
            {byCategory.map((c) => {
              const ratio = c.planned ? Math.min(100, Math.round((c.actual / c.planned) * 100)) : 0;
              const over = c.actual > c.planned;
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.category}</span>
                    <span className={cn("tabular-nums text-muted-foreground", over && "text-danger")}>
                      {formatMoney(c.actual)} / {formatMoney(c.planned)}
                    </span>
                  </div>
                  <Progress value={ratio} className={over ? "[&>div]:bg-danger" : undefined} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Concepto</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Categoría</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Área</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Mes</th>
                <th className="px-4 py-2.5 text-right font-medium">Planeado</th>
                <th className="px-4 py-2.5 text-right font-medium">Ejecutado</th>
                <th className="px-4 py-2.5 text-right font-medium">Variación</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((b) => {
                const variance = b.planned - b.actual;
                return (
                  <tr
                    key={b.id}
                    onClick={() => setComposer({ open: true, id: b.id })}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">{b.concept}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{b.category}</td>
                    <td className="hidden px-4 py-3 md:table-cell"><Badge tone="muted">{deptLabel(b.department)}</Badge></td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{monthLabel(b.month)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.planned)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.actual)}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums font-medium", variance < 0 ? "text-danger" : "text-success")}>
                      {formatMoney(variance)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Pencil className="inline h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <BudgetComposer open={composer.open} lineId={composer.id} onClose={() => setComposer({ open: false })} />
    </div>
  );
}

const emptyBudget = {
  concept: "",
  department: DEPARTMENTS[0] as Department,
  category: BUDGET_CATEGORIES[0] as string,
  month: "",
  planned: "0",
  actual: "0",
  note: "",
};

function BudgetComposer({
  open,
  lineId,
  onClose,
}: {
  open: boolean;
  lineId?: string;
  onClose: () => void;
}) {
  const { data, createBudget, updateBudget, deleteBudget } = useMos();
  const editing = data.budgets.find((b) => b.id === lineId);
  const [form, setForm] = useState(emptyBudget);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        concept: editing.concept,
        department: editing.department,
        category: editing.category,
        month: editing.month,
        planned: String(editing.planned),
        actual: String(editing.actual),
        note: editing.note ?? "",
      });
    } else {
      const now = new Date();
      setForm({ ...emptyBudget, month: format(now, "yyyy-MM") });
    }
  }, [open, editing]);

  const set = (k: keyof typeof emptyBudget, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.concept.trim()) return;
    const payload = {
      concept: form.concept.trim(),
      department: form.department,
      category: form.category,
      month: form.month || format(new Date(), "yyyy-MM"),
      planned: Number(form.planned) || 0,
      actual: Number(form.actual) || 0,
      note: form.note,
    };
    if (editing) updateBudget(editing.id, payload);
    else createBudget(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar línea de presupuesto" : "Nueva línea de presupuesto"}
      footer={
        <>
          {editing && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger/10"
              onClick={() => {
                deleteBudget(editing.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>{editing ? "Guardar" : "Crear"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Concepto">
          <Input value={form.concept} onChange={(e) => set("concept", e.target.value)} placeholder="p. ej. Pauta Meta — Promo llantas" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Área">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{deptLabel(d)}</option>)}
            </Select>
          </Field>
          <Field label="Mes">
            <Input type="month" value={form.month} onChange={(e) => set("month", e.target.value)} />
          </Field>
          <div />
          <Field label="Planeado (COP)">
            <Input type="number" min={0} step={1000} value={form.planned} onChange={(e) => set("planned", e.target.value)} />
          </Field>
          <Field label="Ejecutado (COP)">
            <Input type="number" min={0} step={1000} value={form.actual} onChange={(e) => set("actual", e.target.value)} />
          </Field>
        </div>
        <Field label="Nota">
          <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  );
}
