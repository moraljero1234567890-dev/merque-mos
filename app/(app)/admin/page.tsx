"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  FolderKanban,
  Gauge as GaugeIcon,
  LayoutGrid,
  Shield,
  Timer,
  Users,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { DEPARTMENTS, TASK_STATUSES } from "@/lib/types";
import type { KpiCategory } from "@/lib/types";
import { TASK_STATUS_META, KPI_CATEGORY_META } from "@/lib/labels";
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
import { Avatar, Badge, Card, EmptyState, Progress, Ring } from "@/components/ui";
import { BarsByCategory, DonutChart } from "@/components/charts";
import { cn } from "@/lib/utils";

type Tab = "overview" | "team" | "workload" | "projects" | "activity";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "team", label: "Team", icon: Users },
  { key: "workload", label: "Workload", icon: GaugeIcon },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "activity", label: "Activity", icon: Activity },
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
          title="Admin"
          description="Team performance, workload, project health and the department scorecard."
        />
        <EmptyState
          icon={<Shield className="h-5 w-5" />}
          title="Admin access only"
          description="This cockpit is restricted to admins. Switch to an admin user from the avatar menu in the top-right corner to manage the department."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Admin"
        description="Team performance, workload, project health and the department scorecard."
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
        name: d,
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
        <StatCard label="Team size" value={teamSize} icon={Users} tone="primary" />
        <StatCard label="Active projects" value={activeProjects} icon={FolderKanban} tone="info" />
        <StatCard label="Completion rate" value={`${cRate}%`} icon={CheckCircle2} tone="success" />
        <StatCard
          label="On-time rate"
          value={`${otRate}%`}
          icon={Timer}
          tone={otRate >= 80 ? "success" : otRate >= 60 ? "warning" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">
              {deptBars.length ? "Projects by department" : "Tasks by status"}
            </h2>
          </div>
          <div className="p-5">
            <BarsByCategory data={deptBars.length ? deptBars : statusBars} height={240} />
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Tasks by status</h2>
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
          <h2 className="text-sm font-semibold">Department KPI scorecard</h2>
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
                    avg attainment · {count} KPI{count === 1 ? "" : "s"}
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
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Department</th>
              <th className="px-4 py-2.5 font-medium">Open</th>
              <th className="px-4 py-2.5 font-medium">Done</th>
              <th className="px-4 py-2.5 font-medium">Utilization</th>
              <th className="px-4 py-2.5 font-medium">On-time</th>
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
                    <Badge tone="muted">{p.department}</Badge>
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
                      <Badge tone="danger">{overdue} overdue</Badge>
                    ) : (
                      <Badge tone="success">On track</Badge>
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
        <StatCard label="Overloaded" value={overloaded} icon={GaugeIcon} tone={overloaded ? "danger" : "muted"} />
        <StatCard label="Healthy capacity" value={free} icon={CheckCircle2} tone="success" />
        <StatCard label="Team members" value={rows.length} icon={Users} tone="primary" />
      </div>

      <Card>
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Workload heatmap</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Planned hours vs weekly capacity. Bars turn amber over 80% and red over 100%.
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
                    {logged}h logged this cycle
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
        title="No projects yet"
        description="Create a project to start tracking health across the department."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Project</th>
              <th className="px-4 py-2.5 font-medium">Health</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Owner</th>
              <th className="px-4 py-2.5 font-medium">Progress</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Due</th>
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
                    {format(new Date(p.dueDate), "MMM d")}
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
        title="No activity yet"
        description="Actions across tasks, projects and meetings will show up here."
      />
    );
  }

  return (
    <Card>
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">Activity feed</h2>
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
                    <span className="font-medium">{actor?.name ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{a.summary}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
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
