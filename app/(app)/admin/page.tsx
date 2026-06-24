"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow, format, isThisWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  Gauge as GaugeIcon,
  LayoutGrid,
  Repeat,
  Shield,
  Timer,
  UserCog,
  Users,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { DEPARTMENTS, TASK_STATUSES } from "@/lib/types";
import type { KpiCategory } from "@/lib/types";
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
} from "@/components/ui";
import { BarsByCategory, DonutChart } from "@/components/charts";
import { cn } from "@/lib/utils";

type Tab = "overview" | "follow" | "team" | "workload" | "projects" | "users" | "activity";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid; live?: boolean }[] = [
  { key: "overview", label: "Resumen", icon: LayoutGrid },
  { key: "follow", label: "Seguimiento", icon: ClipboardCheck },
  { key: "team", label: "Equipo", icon: Users },
  { key: "workload", label: "Carga", icon: GaugeIcon },
  { key: "projects", label: "Proyectos", icon: FolderKanban },
  { key: "users", label: "Usuarios", icon: UserCog, live: true },
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
  const { isAdmin, live } = useMos();
  const [tab, setTab] = useState<Tab>("overview");
  const focusUser = params.get("user");
  const tabs = TABS.filter((t) => !t.live || live);

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
        {tabs.map((t) => (
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
      {tab === "follow" && <TeamFollowUp />}
      {tab === "team" && <Team focusUser={focusUser} />}
      {tab === "workload" && <Workload />}
      {tab === "projects" && <ProjectHealth />}
      {tab === "users" && <UserManagement />}
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

/* ------------------------------------------------------------ User management */

function UserManagement() {
  const { data } = useMos();
  const [edit, setEdit] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gestiona las cuentas del equipo: cambia el correo o restablece la contraseña de cualquier miembro.
      </p>
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {data.profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar id={p.id} name={p.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
              <Badge tone={p.role === "admin" ? "primary" : "muted"}>{p.role}</Badge>
              <Button variant="outline" size="sm" onClick={() => setEdit(p.id)}>
                Editar
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <UserEditModal userId={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function UserEditModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data } = useMos();
  const profile = data.profiles.find((p) => p.id === userId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setEmail(profile.email);
      setPassword("");
      setMsg(null);
    }
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    setLoading(true);
    setMsg(null);
    const body: { userId: string; email?: string; password?: string } = { userId: profile.id };
    if (email.trim() && email.trim().toLowerCase() !== profile.email) body.email = email.trim();
    if (password) body.password = password;
    if (!body.email && !body.password) {
      setLoading(false);
      return setMsg({ ok: false, text: "No hay cambios que guardar." });
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Error" });
      setMsg({ ok: true, text: "Cuenta actualizada. Los cambios aplican al iniciar sesión de nuevo." });
      setPassword("");
    } catch {
      setLoading(false);
      setMsg({ ok: false, text: "Error de red." });
    }
  };

  return (
    <Modal
      open={!!userId}
      onClose={onClose}
      title={`Editar — ${profile.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Correo">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Nueva contraseña (opcional)">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Déjalo vacío para no cambiarla"
            autoComplete="off"
          />
        </Field>
        {msg && (
          <p className={cn("rounded-lg border px-3 py-2 text-xs font-medium", msg.ok ? "border-success/20 bg-success/10 text-success" : "border-danger/20 bg-danger/10 text-danger")}>
            {msg.text}
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- Team follow-up */

function TeamFollowUp() {
  const { data } = useMos();

  const isThisWeekNotToday = (d: Date) =>
    isThisWeek(d, { weekStartsOn: 1 }) && !isToday(d);

  const members = useMemo(() => {
    return data.profiles
      .map((p) => {
        const open = data.tasks
          .filter((t) => t.assigneeId === p.id && t.status !== "done" && t.dueDate)
          .map((t) => ({ t, due: new Date(t.dueDate as string) }));
        const overdue = open.filter((x) => isOverdue(x.t)).sort((a, b) => +a.due - +b.due);
        const dueToday = open.filter((x) => isToday(x.due)).sort((a, b) => +a.due - +b.due);
        const week = open
          .filter((x) => !isOverdue(x.t) && isThisWeekNotToday(x.due))
          .sort((a, b) => +a.due - +b.due);
        return { p, overdue, dueToday, week, attention: overdue.length * 2 + dueToday.length };
      })
      .sort((a, b) => b.attention - a.attention);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tasks, data.profiles]);

  const totals = members.reduce(
    (acc, m) => ({
      overdue: acc.overdue + m.overdue.length,
      today: acc.today + m.dueToday.length,
      week: acc.week + m.week.length,
    }),
    { overdue: 0, today: 0, week: 0 },
  );

  const Row = ({ t, due }: { t: (typeof members)[number]["dueToday"][number]["t"]; due: Date }) => {
    const project = data.projects.find((p) => p.id === t.projectId);
    return (
      <div className="flex items-center gap-2.5 px-4 py-2 text-sm">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: TASK_STATUS_META[t.status].dot }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate">{t.title}</span>
            {t.recurringId && (
              <span title="Recurrente">
                <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
              </span>
            )}
          </div>
          {project && <span className="text-xs text-muted-foreground">{project.name}</span>}
        </div>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            isOverdue(t) ? "text-danger" : isToday(due) ? "text-warning" : "text-muted-foreground",
          )}
        >
          {format(due, "d MMM", { locale: es })}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Lo que el equipo tiene pendiente hoy — recurrente <Repeat className="inline h-3 w-3" /> y específico —
        para tu seguimiento diario.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Vencidas (equipo)" value={totals.overdue} icon={ClipboardCheck} tone={totals.overdue ? "danger" : "muted"} />
        <StatCard label="Para hoy" value={totals.today} icon={Timer} tone={totals.today ? "warning" : "muted"} />
        <StatCard label="Esta semana" value={totals.week} icon={Activity} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {members.map(({ p, overdue, dueToday, week }) => {
          const total = overdue.length + dueToday.length + week.length;
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <Avatar id={p.id} name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.title}</div>
                </div>
                {overdue.length > 0 && <Badge tone="danger">{overdue.length} vencidas</Badge>}
                {dueToday.length > 0 && <Badge tone="warning">{dueToday.length} hoy</Badge>}
              </div>

              {total === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin pendientes con fecha. 🎉</p>
              ) : (
                <div className="divide-y divide-border">
                  {overdue.length > 0 && (
                    <div>
                      <div className="bg-danger/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-danger">Vencidas</div>
                      {overdue.map((x) => <Row key={x.t.id} t={x.t} due={x.due} />)}
                    </div>
                  )}
                  {dueToday.length > 0 && (
                    <div>
                      <div className="bg-warning/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning">Hoy</div>
                      {dueToday.map((x) => <Row key={x.t.id} t={x.t} due={x.due} />)}
                    </div>
                  )}
                  {week.length > 0 && (
                    <div>
                      <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Esta semana</div>
                      {week.map((x) => <Row key={x.t.id} t={x.t} due={x.due} />)}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
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
