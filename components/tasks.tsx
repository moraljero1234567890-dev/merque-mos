"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, MessageSquare, Repeat, Trash2 } from "lucide-react";
import { useMos } from "@/lib/store";
import { DEPARTMENTS, PRIORITIES, TASK_STATUSES } from "@/lib/types";
import type { Task, TaskStatus } from "@/lib/types";
import { PRIORITY_META, TASK_STATUS_META } from "@/lib/labels";
import {
  Avatar,
  Button,
  Dot,
  Field,
  Input,
  Modal,
  Select,
  Separator,
  Textarea,
} from "./ui";
import { PriorityBadge } from "./badges";
import { cn } from "@/lib/utils";

export function dueMeta(task: Task) {
  if (!task.dueDate || task.status === "done") return null;
  const d = startOfDay(new Date(task.dueDate));
  const overdue = isBefore(d, startOfDay(new Date()));
  const today = isToday(d);
  return {
    overdue,
    today,
    label: format(d, "MMM d"),
    tone: overdue ? "text-danger" : today ? "text-warning" : "text-muted-foreground",
  };
}

export function TaskRow({
  task,
  onOpen,
  showProject = true,
}: {
  task: Task;
  onOpen: (id: string) => void;
  showProject?: boolean;
}) {
  const { data, moveTask } = useMos();
  const assignee = data.profiles.find((p) => p.id === task.assigneeId);
  const project = data.projects.find((p) => p.id === task.projectId);
  const due = dueMeta(task);
  const done = task.status === "done";

  return (
    <div
      onClick={() => onOpen(task.id)}
      className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          moveTask(task.id, done ? "todo" : "done");
        }}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-success bg-success text-white" : "border-border-strong hover:border-primary",
        )}
        aria-label="Toggle done"
      >
        {done && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
            {task.title}
          </span>
          {task.recurringId && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </div>
        {showProject && project && (
          <span className="text-xs text-muted-foreground">{project.name}</span>
        )}
      </div>

      <div className="hidden md:block">
        <PriorityBadge priority={task.priority} />
      </div>

      {due && <span className={cn("hidden text-xs font-medium sm:inline", due.tone)}>{due.label}</span>}

      {assignee && <Avatar id={assignee.id} name={assignee.name} size={24} />}
    </div>
  );
}

// Marker prefix for reschedule comments (date-change history).
const RESCHED = "🗓️";

const empty = {
  title: "",
  description: "",
  assigneeId: "",
  projectId: "",
  status: "todo" as TaskStatus,
  priority: "medium",
  dueDate: "",
  estimatedHours: "1",
  actualHours: "0",
  notes: "",
};

export function TaskComposer({
  open,
  onClose,
  taskId,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  taskId?: string | null;
  defaults?: Partial<typeof empty>;
}) {
  const { data, me, createTask, updateTask, deleteTask, addComment, moveTask } = useMos();
  const editing = useMemo(() => data.tasks.find((t) => t.id === taskId), [data.tasks, taskId]);
  const [form, setForm] = useState(empty);
  const [comment, setComment] = useState("");
  const [reDate, setReDate] = useState(""); // reprogramación
  const [reReason, setReReason] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? "",
        assigneeId: editing.assigneeId ?? "",
        projectId: editing.projectId ?? "",
        status: editing.status,
        priority: editing.priority,
        dueDate: editing.dueDate ?? "",
        estimatedHours: String(editing.estimatedHours),
        actualHours: String(editing.actualHours),
        notes: editing.notes ?? "",
      });
    } else {
      setForm({ ...empty, assigneeId: me.id, ...defaults });
    }
  }, [open, editing, me.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim()) return;
    const base = {
      title: form.title.trim(),
      description: form.description,
      assigneeId: form.assigneeId || null,
      projectId: form.projectId || null,
      status: form.status,
      priority: form.priority as Task["priority"],
      estimatedHours: Number(form.estimatedHours) || 0,
      actualHours: Number(form.actualHours) || 0,
      notes: form.notes,
    };
    // The due date is only set at creation; afterwards it can ONLY move via a
    // logged reschedule (so the history of delays is preserved).
    if (editing) updateTask(editing.id, base);
    else createTask({ ...base, dueDate: form.dueDate || null });
    onClose();
  };

  // Reschedule the due date with a reason — leaves a dated comment, never a
  // silent edit. The current date moves; the trail explains why.
  const reschedule = () => {
    if (!editing || !reDate) return;
    const oldLabel = editing.dueDate
      ? format(new Date(editing.dueDate), "d MMM yyyy", { locale: es })
      : "sin fecha";
    const newLabel = format(new Date(reDate), "d MMM yyyy", { locale: es });
    updateTask(editing.id, { dueDate: reDate });
    addComment(
      editing.id,
      `${RESCHED} ${oldLabel} → ${newLabel}${reReason.trim() ? ` · ${reReason.trim()}` : ""}`,
    );
    setForm((f) => ({ ...f, dueDate: reDate }));
    setReDate("");
    setReReason("");
  };

  const allComments = data.comments.filter((c) => c.taskId === taskId);
  const reschedules = allComments.filter((c) => c.body.startsWith(RESCHED));
  const comments = allComments.filter((c) => !c.body.startsWith(RESCHED));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Tarea" : "Nueva tarea"}
      size="lg"
      footer={
        <>
          {editing && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger/10"
              onClick={() => {
                deleteTask(editing.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{editing ? "Guardar" : "Crear tarea"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
        </Field>
        <Field label="Descripción">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Agrega detalle…" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsable">
            <Select value={form.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
              <option value="">Sin asignar</option>
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proyecto">
            <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">Sin proyecto</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha límite">
            {editing ? (
              <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span>{form.dueDate ? format(new Date(form.dueDate), "d MMM yyyy", { locale: es }) : "Sin fecha"}</span>
                {reschedules.length > 0 && (
                  <span className="text-xs text-muted-foreground">· reprogramada {reschedules.length}×</span>
                )}
              </div>
            ) : (
              <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            )}
          </Field>
        </div>

        <Field label="Notas / bloqueos">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Registra un bloqueo o contexto…" className="min-h-[60px]" />
        </Field>

        {editing && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    moveTask(editing.id, s);
                    set("status", s);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    form.status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Dot color={TASK_STATUS_META[s].dot} />
                  {TASK_STATUS_META[s].label}
                </button>
              ))}
            </div>

            <Separator />

            {/* Reprogramar fecha (con motivo) */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Reprogramar fecha
              </div>
              {reschedules.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {reschedules.map((c) => {
                    const author = data.profiles.find((p) => p.id === c.authorId);
                    return (
                      <div key={c.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-xs">
                        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="text-foreground">{c.body.replace(RESCHED, "").trim()}</span>
                          <span className="ml-1 text-muted-foreground">
                            — {author?.name?.split(" ")[0]}, {format(new Date(c.createdAt), "d MMM", { locale: es })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} className="sm:w-44" />
                <Input
                  value={reReason}
                  onChange={(e) => setReReason(e.target.value)}
                  placeholder="Motivo del aplazamiento…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      reschedule();
                    }
                  }}
                />
                <Button variant="secondary" onClick={reschedule} disabled={!reDate}>
                  Reprogramar
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                La fecha se mueve y queda registrada. La fecha original nunca se borra del historial.
              </p>
            </div>

            <Separator />

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentarios
                <span className="text-muted-foreground">{comments.length}</span>
              </div>
              <div className="space-y-3">
                {comments.map((c) => {
                  const author = data.profiles.find((p) => p.id === c.authorId);
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar id={c.authorId} name={author?.name ?? "?"} size={26} />
                      <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{author?.name}</span>
                          <span className="text-muted-foreground">{format(new Date(c.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                        <p className="mt-0.5 text-sm">{c.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      addComment(editing.id, comment.trim());
                      setComment("");
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (comment.trim()) {
                      addComment(editing.id, comment.trim());
                      setComment("");
                    }
                  }}
                >
                  Enviar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// Re-export for convenience in pages that build their own composers.
export { DEPARTMENTS };
