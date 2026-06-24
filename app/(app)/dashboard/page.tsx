"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isThisWeek, isToday } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Megaphone,
  Plus,
  Target,
} from "lucide-react";
import { useMos } from "@/lib/store";
import {
  capacityUtilization,
  completionRate,
  isOverdue,
  onTimeRate,
  plannedHours,
  projectHealth,
  HEALTH_META,
} from "@/lib/selectors";
import { PRIORITY_META } from "@/lib/labels";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { TaskComposer, TaskRow, dueMeta } from "@/components/tasks";
import { Avatar, Badge, Button, Card, Progress, Ring } from "@/components/ui";
import { Gauge } from "@/components/charts";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock;
  tone?: string;
  hint?: string;
}) {
  const toneColor: Record<string, string> = {
    danger: "text-danger bg-danger/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
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

export default function DashboardPage() {
  const { data, me, isAdmin } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string | null }>({ open: false });

  const myTasks = useMemo(
    () => data.tasks.filter((t) => t.assigneeId === me.id),
    [data.tasks, me.id],
  );
  const open = myTasks.filter((t) => t.status !== "done");
  const overdue = open.filter(isOverdue);
  const dueThisWeek = open.filter((t) => t.dueDate && isThisWeek(new Date(t.dueDate), { weekStartsOn: 1 }));

  const priorities = useMemo(
    () =>
      [...open]
        .sort((a, b) => {
          const ao = isOverdue(a) ? 1 : 0;
          const bo = isOverdue(b) ? 1 : 0;
          if (ao !== bo) return bo - ao;
          if (PRIORITY_META[a.priority].rank !== PRIORITY_META[b.priority].rank)
            return PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank;
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        })
        .slice(0, 7),
    [open],
  );

  const upcoming = useMemo(
    () =>
      [...open]
        .filter((t) => t.dueDate && !isOverdue(t))
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, 5),
    [open],
  );

  const myKpis = data.kpis.filter((k) => k.ownerId === me.id);
  const announcements = [...data.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const hours = plannedHours(data, me.id);
  const util = capacityUtilization(data, me);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${greeting}, ${me.name.split(" ")[0]}`}
        description={format(new Date(), "EEEE, MMMM d")}
        actions={
          <Button onClick={() => setComposer({ open: true })}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open tasks" value={open.length} icon={CheckCircle2} tone="info" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone={overdue.length ? "danger" : "muted"} />
        <StatCard label="Due this week" value={dueThisWeek.length} icon={CalendarClock} tone="warning" />
        <StatCard label="Planned hours" value={`${hours}h`} icon={Clock} tone="success" hint={`${util}% of capacity`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: priorities + upcoming */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Today&apos;s priorities</h2>
                <Badge tone={overdue.length ? "danger" : "muted"}>{priorities.length}</Badge>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">
                All tasks
              </Link>
            </div>
            {priorities.length ? (
              <div className="divide-y divide-border">
                {priorities.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={(id) => setComposer({ open: true, id })} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="text-sm font-medium">Inbox zero — nice.</p>
                <p className="text-xs text-muted-foreground">No open tasks need your attention right now.</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">Upcoming deadlines</h2>
            </div>
            {upcoming.length ? (
              <div className="divide-y divide-border">
                {upcoming.map((t) => {
                  const due = dueMeta(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setComposer({ open: true, id: t.id })}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                      <span className={cn("text-xs font-medium", due?.tone)}>{due?.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming deadlines.</p>
            )}
          </Card>

          {isAdmin && <AdminDashboard />}
        </div>

        {/* Right: announcements + KPIs */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Announcements</h2>
            </div>
            <div className="divide-y divide-border">
              {announcements.map((a) => {
                const author = data.profiles.find((p) => p.id === a.authorId);
                return (
                  <div key={a.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Badge tone="primary">Pinned</Badge>}
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar id={a.authorId} name={author?.name ?? "?"} size={18} />
                      {author?.name} · {format(new Date(a.createdAt), "MMM d")}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">My KPIs</h2>
            </div>
            <div className="space-y-4 p-5">
              {myKpis.length ? (
                myKpis.map((k) => {
                  const prog =
                    k.direction === "up"
                      ? Math.round((k.current / k.target) * 100)
                      : Math.round((k.target / Math.max(k.current, 0.001)) * 100);
                  return (
                    <div key={k.id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{k.name}</span>
                        <span className="text-muted-foreground">
                          {k.current.toLocaleString()}
                          {k.unit} / {k.target.toLocaleString()}
                          {k.unit}
                        </span>
                      </div>
                      <Progress value={prog} />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No KPIs assigned to you yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <TaskComposer
        open={composer.open}
        taskId={composer.id}
        onClose={() => setComposer({ open: false })}
      />
    </div>
  );
}

function AdminDashboard() {
  const { data } = useMos();
  const members = data.profiles;

  const cRate = completionRate(data);
  const otRate = onTimeRate(data);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle action={<Link href="/admin" className="text-xs font-medium text-primary hover:underline">Open admin</Link>}>
          Department scorecard
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="flex flex-col items-center p-4">
            <Gauge value={cRate} height={120} label="completion" />
          </Card>
          <Card className="flex flex-col items-center p-4">
            <Gauge value={otRate} height={120} label="on-time" color="var(--success)" />
          </Card>
          <Card className="col-span-2 p-4">
            <div className="text-sm font-medium">Active projects</div>
            <div className="mt-3 space-y-2.5">
              {data.projects
                .filter((p) => p.status === "active")
                .slice(0, 4)
                .map((p) => {
                  const health = projectHealth(p, data.tasks);
                  const hm = HEALTH_META[health];
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hm.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Team workload</h2>
          <Link href="/admin" className="text-xs font-medium text-primary hover:underline">
            Heatmap <ArrowUpRight className="inline h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3 p-5">
          {members.map((m) => {
            const util = capacityUtilization(data, m);
            const tone = util > 100 ? "danger" : util > 80 ? "warning" : "success";
            const color = tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--success)";
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar id={m.id} name={m.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="text-muted-foreground">{util}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(util, 100)}%`, background: color }} />
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
