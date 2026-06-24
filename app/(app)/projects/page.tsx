"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import {
  Columns3,
  GanttChartSquare,
  Plus,
  Table2,
} from "lucide-react";
import { useMos } from "@/lib/store";
import {
  DEPARTMENTS,
  PRIORITIES,
  PROJECT_STATUSES,
} from "@/lib/types";
import type { Project, ProjectStatus } from "@/lib/types";
import { PROJECT_STATUS_META } from "@/lib/labels";
import { HEALTH_META, projectHealth } from "@/lib/selectors";
import { PageHeader } from "@/components/page-header";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Progress,
  Select,
  Textarea,
} from "@/components/ui";
import { PriorityBadge, ProjectStatusBadge } from "@/components/badges";
import { TaskComposer, TaskRow } from "@/components/tasks";
import { cn } from "@/lib/utils";

type View = "kanban" | "table" | "timeline";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsInner />
    </Suspense>
  );
}

function ProjectsInner() {
  const params = useSearchParams();
  const { data } = useMos();
  const [view, setView] = useState<View>("kanban");
  const [composer, setComposer] = useState<{ open: boolean; id?: string }>({ open: false });
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("new")) setComposer({ open: true });
    const id = params.get("id");
    if (id) setDetail(id);
  }, [params]);

  const views: { key: View; label: string; icon: typeof Columns3 }[] = [
    { key: "kanban", label: "Kanban", icon: Columns3 },
    { key: "table", label: "Table", icon: Table2 },
    { key: "timeline", label: "Timeline", icon: GanttChartSquare },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projects"
        description="Plan and track every marketing initiative across the 26 stores."
        actions={
          <Button onClick={() => setComposer({ open: true })}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-0.5">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === v.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className="h-4 w-4" />
            {v.label}
          </button>
        ))}
      </div>

      {view === "kanban" && <KanbanView onOpen={setDetail} />}
      {view === "table" && <TableView onOpen={setDetail} />}
      {view === "timeline" && <TimelineView onOpen={setDetail} />}

      <ProjectComposer open={composer.open} projectId={composer.id} onClose={() => setComposer({ open: false })} />
      <ProjectDetail
        projectId={detail}
        onClose={() => setDetail(null)}
        onEdit={(id) => {
          setDetail(null);
          setComposer({ open: true, id });
        }}
      />
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (id: string) => void }) {
  const { data } = useMos();
  const owner = data.profiles.find((p) => p.id === project.ownerId);
  const taskCount = data.tasks.filter((t) => t.projectId === project.id).length;
  const health = projectHealth(project, data.tasks);
  const hm = HEALTH_META[health];

  return (
    <button
      onClick={() => onOpen(project.id)}
      className="group w-full rounded-xl border border-border bg-card p-4 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-all hover:border-border-strong hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug">{project.name}</span>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: hm.color }} title={hm.label} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="muted">{project.department}</Badge>
        <PriorityBadge priority={project.priority} />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{project.progress}%</span>
          <span>{taskCount} tasks</span>
        </div>
        <Progress value={project.progress} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        {owner && (
          <div className="flex items-center gap-1.5">
            <Avatar id={owner.id} name={owner.name} size={22} />
            <span className="text-xs text-muted-foreground">{owner.name.split(" ")[0]}</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground">{format(new Date(project.dueDate), "MMM d")}</span>
      </div>
    </button>
  );
}

function KanbanView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useMos();
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto pb-2">
      {PROJECT_STATUSES.map((status) => {
        const items = data.projects.filter((p) => p.status === status);
        return (
          <div key={status} className="w-72 shrink-0 px-1">
            <div className="mb-3 flex items-center gap-2">
              <ProjectStatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={onOpen} />
              ))}
              {!items.length && (
                <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  Nothing here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useMos();
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Project</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Department</th>
              <th className="px-4 py-2.5 font-medium">Progress</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Due</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => {
              const owner = data.profiles.find((x) => x.id === p.ownerId);
              return (
                <tr
                  key={p.id}
                  onClick={() => onOpen(p.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    {owner && (
                      <div className="flex items-center gap-2">
                        <Avatar id={owner.id} name={owner.name} size={22} />
                        <span className="hidden text-muted-foreground lg:inline">{owner.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={p.priority} /></td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{p.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress} className="w-20" />
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{format(new Date(p.dueDate), "MMM d")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TimelineView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useMos();
  const projects = data.projects;

  const { min, max } = useMemo(() => {
    const starts = projects.map((p) => new Date(p.startDate).getTime());
    const ends = projects.map((p) => new Date(p.dueDate).getTime());
    return { min: Math.min(...starts), max: Math.max(...ends) };
  }, [projects]);
  const span = Math.max(1, max - min);

  return (
    <Card className="overflow-x-auto p-5">
      <div className="min-w-[640px] space-y-2.5">
        {projects.map((p) => {
          const s = new Date(p.startDate).getTime();
          const e = new Date(p.dueDate).getTime();
          const left = ((s - min) / span) * 100;
          const width = Math.max(4, ((e - s) / span) * 100);
          const hm = HEALTH_META[projectHealth(p, data.tasks)];
          return (
            <div key={p.id} className="flex items-center gap-3">
              <button onClick={() => onOpen(p.id)} className="w-40 shrink-0 truncate text-left text-sm font-medium hover:text-primary">
                {p.name}
              </button>
              <div className="relative h-7 flex-1 rounded-md bg-muted/50">
                <div
                  onClick={() => onOpen(p.id)}
                  className="absolute top-0 flex h-7 cursor-pointer items-center rounded-md px-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                  style={{ left: `${left}%`, width: `${width}%`, background: hm.color }}
                >
                  <span className="truncate">{p.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between text-xs text-muted-foreground">
        <span>{format(new Date(min), "MMM d, yyyy")}</span>
        <span>{format(new Date(max), "MMM d, yyyy")}</span>
      </div>
    </Card>
  );
}

const blank = {
  name: "",
  description: "",
  ownerId: "",
  status: "planning" as ProjectStatus,
  priority: "medium",
  department: DEPARTMENTS[0],
  startDate: "",
  dueDate: "",
  progress: "0",
};

function ProjectComposer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
}) {
  const { data, me, createProject, updateProject } = useMos();
  const editing = data.projects.find((p) => p.id === projectId);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description,
        ownerId: editing.ownerId,
        status: editing.status,
        priority: editing.priority,
        department: editing.department,
        startDate: editing.startDate,
        dueDate: editing.dueDate,
        progress: String(editing.progress),
      });
    } else {
      setForm({ ...blank, ownerId: me.id, department: me.department });
    }
  }, [open, editing, me.id, me.department]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description,
      ownerId: form.ownerId,
      status: form.status,
      priority: form.priority as Project["priority"],
      department: form.department as Project["department"],
      startDate: form.startDate || format(new Date(), "yyyy-MM-dd"),
      dueDate: form.dueDate || format(new Date(), "yyyy-MM-dd"),
      progress: Number(form.progress) || 0,
    };
    if (editing) updateProject(editing.id, payload);
    else createProject(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit project" : "New project"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save" : "Create project"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Q4 Loyalty Push" autoFocus />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner">
            <Select value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_META[s].label}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Start date">
            <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
        </div>
        <Field label={`Progress — ${form.progress}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => set("progress", e.target.value)}
            className="w-full accent-[var(--primary)]"
          />
        </Field>
      </div>
    </Modal>
  );
}

function ProjectDetail({
  projectId,
  onClose,
  onEdit,
}: {
  projectId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const { data, updateProject } = useMos();
  const [taskComposer, setTaskComposer] = useState<{ open: boolean; id?: string | null }>({ open: false });
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const owner = data.profiles.find((p) => p.id === project.ownerId);
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.status === "done").length;
  const daysLeft = differenceInCalendarDays(startOfDay(new Date(project.dueDate)), startOfDay(new Date()));
  const hm = HEALTH_META[projectHealth(project, data.tasks)];

  return (
    <>
      <Modal
        open={!!projectId && !taskComposer.open}
        onClose={onClose}
        size="lg"
        footer={
          <>
            <Button variant="ghost" className="mr-auto" onClick={() => setTaskComposer({ open: true })}>
              <Plus className="h-4 w-4" /> Add task
            </Button>
            <Button variant="outline" onClick={() => onEdit(project.id)}>Edit project</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={hm.tone}>{hm.label}</Badge>
              <ProjectStatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">{project.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Owner", value: owner?.name.split(" ")[0] ?? "—" },
              { label: "Department", value: project.department },
              { label: "Due", value: format(new Date(project.dueDate), "MMM d") },
              { label: daysLeft < 0 ? "Overdue" : "Days left", value: Math.abs(daysLeft) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-surface/50 p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-0.5 text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{project.progress}% · {done}/{tasks.length} tasks done</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={project.progress}
              onChange={(e) => updateProject(project.id, { progress: Number(e.target.value) })}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Tasks</div>
            <div className="overflow-hidden rounded-lg border border-border">
              {tasks.length ? (
                <div className="divide-y divide-border">
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} showProject={false} onOpen={(id) => setTaskComposer({ open: true, id })} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No tasks yet.</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <TaskComposer
        open={taskComposer.open}
        taskId={taskComposer.id}
        defaults={{ projectId: project.id }}
        onClose={() => setTaskComposer({ open: false })}
      />
    </>
  );
}
