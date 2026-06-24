"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Columns3, List, Plus, Search } from "lucide-react";
import { useMos } from "@/lib/store";
import { PRIORITIES, TASK_STATUSES } from "@/lib/types";
import type { TaskStatus } from "@/lib/types";
import { TASK_STATUS_META, PRIORITY_META } from "@/lib/labels";
import { isOverdue } from "@/lib/selectors";
import { PageHeader } from "@/components/page-header";
import { TaskComposer, TaskRow, dueMeta } from "@/components/tasks";
import { Avatar, Badge, Button, Card, Dot, Input, Select } from "@/components/ui";
import { PriorityBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksInner />
    </Suspense>
  );
}

function TasksInner() {
  const params = useSearchParams();
  const { data, me } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string | null }>({ open: false });
  const [view, setView] = useState<"list" | "board">("list");
  const [q, setQ] = useState("");
  const [assignee, setAssignee] = useState("me");
  const [priority, setPriority] = useState("all");
  const [project, setProject] = useState("all");

  useEffect(() => {
    if (params.get("new")) setComposer({ open: true });
    const id = params.get("id");
    if (id) setComposer({ open: true, id });
  }, [params]);

  const filtered = useMemo(() => {
    return data.tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (assignee === "me" && t.assigneeId !== me.id) return false;
      if (assignee !== "me" && assignee !== "all" && t.assigneeId !== assignee) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (project !== "all" && t.projectId !== project) return false;
      return true;
    });
  }, [data.tasks, q, assignee, priority, project, me.id]);

  const open = (id?: string | null) => setComposer({ open: true, id });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tareas"
        description="Todo lo asignado en el departamento, con carga de trabajo y fechas límite."
        actions={
          <Button onClick={() => setComposer({ open: true })}>
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar tareas…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-auto">
            <option value="me">Mis tareas</option>
            <option value="all">Todos</option>
            {data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
            <option value="all">Toda prioridad</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </Select>
          <Select value={project} onChange={(e) => setProject(e.target.value)} className="hidden w-auto md:block">
            <option value="all">Todos los proyectos</option>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5">
            <button onClick={() => setView("list")} className={cn("rounded-md p-1.5", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground")} aria-label="Vista de lista">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView("board")} className={cn("rounded-md p-1.5", view === "board" ? "bg-muted text-foreground" : "text-muted-foreground")} aria-label="Vista de tablero">
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-4">
          {TASK_STATUSES.map((status) => {
            const items = filtered.filter((t) => t.status === status);
            if (!items.length) return null;
            return (
              <Card key={status} className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <Dot color={TASK_STATUS_META[status].dot} />
                  <span className="text-sm font-semibold">{TASK_STATUS_META[status].label}</span>
                  <Badge tone="muted">{items.length}</Badge>
                </div>
                <div className="divide-y divide-border">
                  {items.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}
                </div>
              </Card>
            );
          })}
          {!filtered.length && (
            <Card className="py-16 text-center text-sm text-muted-foreground">Ninguna tarea coincide con estos filtros.</Card>
          )}
        </div>
      ) : (
        <BoardView statusFilter={filtered} onOpen={open} />
      )}

      <TaskComposer open={composer.open} taskId={composer.id} onClose={() => setComposer({ open: false })} />
    </div>
  );
}

function BoardView({
  statusFilter,
  onOpen,
}: {
  statusFilter: ReturnType<typeof useMos>["data"]["tasks"];
  onOpen: (id: string) => void;
}) {
  const { data } = useMos();
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const items = statusFilter.filter((t) => t.status === status);
        return (
          <div key={status} className="w-72 shrink-0 px-1">
            <div className="mb-3 flex items-center gap-2">
              <Dot color={TASK_STATUS_META[status].dot} />
              <span className="text-sm font-semibold">{TASK_STATUS_META[status].label}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => {
                const assignee = data.profiles.find((p) => p.id === t.assigneeId);
                const project = data.projects.find((p) => p.id === t.projectId);
                const due = dueMeta(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => onOpen(t.id)}
                    className={cn(
                      "w-full rounded-lg border border-border bg-card p-3 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-all hover:border-border-strong hover:shadow-md",
                      isOverdue(t) && "border-danger/40",
                    )}
                  >
                    <div className="text-sm font-medium leading-snug">{t.title}</div>
                    {project && <div className="mt-0.5 text-xs text-muted-foreground">{project.name}</div>}
                    <div className="mt-2.5 flex items-center justify-between">
                      <PriorityBadge priority={t.priority} />
                      <div className="flex items-center gap-2">
                        {due && <span className={cn("text-xs font-medium", due.tone)}>{due.label}</span>}
                        {assignee && <Avatar id={assignee.id} name={assignee.name} size={22} />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!items.length && (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Vacío</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
