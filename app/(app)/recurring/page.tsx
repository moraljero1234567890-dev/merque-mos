"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  Clock,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { DEPARTMENTS, FREQUENCIES, PRIORITIES } from "@/lib/types";
import type {
  Department,
  Frequency,
  Priority,
  RecurringTask,
} from "@/lib/types";
import { FREQUENCY_META, PRIORITY_META, deptLabel } from "@/lib/labels";
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
  Select,
  Textarea,
} from "@/components/ui";
import { PriorityBadge } from "@/components/badges";
import { TaskRow } from "@/components/tasks";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------- date helpers */

function stepDate(date: Date, freq: Frequency): Date {
  switch (freq) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addWeeks(date, 1);
    case "biweekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addQuarters(date, 1);
    case "semiannual":
      return addMonths(date, 6);
    case "yearly":
      return addYears(date, 1);
  }
}

/** Next occurrence date strictly after today, stepping from the anchor. */
function nextOccurrence(r: RecurringTask): Date {
  const today = startOfDay(new Date());
  let cursor = startOfDay(new Date(r.anchorDate));
  let guard = 0;
  while (cursor <= today && guard < 5000) {
    cursor = stepDate(cursor, r.frequency);
    guard++;
  }
  return cursor;
}

const WEEKLY_FACTOR: Record<Frequency, number> = {
  daily: 5,
  weekly: 1,
  biweekly: 1 / 2,
  monthly: 1 / 4.3,
  quarterly: 1 / 13,
  semiannual: 1 / 26,
  yearly: 1 / 52,
};

/* ------------------------------------------------------------------ stat card */

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

/* ------------------------------------------------------------- toggle switch */

function ToggleSwitch({
  on,
  onClick,
}: {
  on: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
      aria-label={on ? "Pausar recurrente" : "Activar recurrente"}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------- page */

export default function RecurringPage() {
  const {
    data,
    me,
    toggleRecurring,
    runRecurringNow,
  } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string }>({ open: false });

  const today = startOfDay(new Date());

  // Each person sees their own recurring work.
  const definitions = useMemo(
    () => data.recurring.filter((r) => r.assigneeId === me.id),
    [data.recurring, me.id],
  );
  const activeCount = definitions.filter((r) => r.active).length;
  const pausedCount = definitions.length - activeCount;

  const generatedThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return data.tasks.filter(
      (t) =>
        t.recurringId &&
        t.assigneeId === me.id &&
        t.dueDate &&
        isWithinInterval(new Date(t.dueDate), { start, end }),
    ).length;
  }, [data.tasks, me.id]);

  const weeklyHours = useMemo(() => {
    const total = definitions
      .filter((r) => r.active)
      .reduce((sum, r) => sum + r.estimatedHours * WEEKLY_FACTOR[r.frequency], 0);
    return Math.round(total);
  }, [definitions]);

  const upcoming = useMemo(() => {
    const todayIso = format(today, "yyyy-MM-dd");
    return data.tasks
      .filter((t) => t.recurringId != null && t.assigneeId === me.id && t.dueDate && t.dueDate >= todayIso)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tasks, me.id]);

  const byFrequency = useMemo(
    () =>
      FREQUENCIES.map((freq) => ({
        freq,
        items: definitions.filter((r) => r.frequency === freq),
      })).filter((g) => g.items.length > 0),
    [definitions],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Trabajo recurrente"
        description="Rituales de marketing automatizados y repetitivos: reportes, auditorías y comités."
        actions={
          <Button onClick={() => setComposer({ open: true })}>
            <Plus className="h-4 w-4" />
            Nueva tarea recurrente
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Definiciones activas" value={activeCount} icon={Repeat} tone="primary" />
        <StatCard label="En pausa" value={pausedCount} icon={PauseCircle} tone={pausedCount ? "warning" : "muted"} />
        <StatCard label="Generadas este mes" value={generatedThisMonth} icon={Sparkles} tone="info" />
        <StatCard label="Horas recurrentes semanales" value={`${weeklyHours}h`} icon={Clock} tone="success" hint="Normalizado por frecuencia" />
      </div>

      {definitions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Repeat className="h-5 w-5" />}
            title="Aún no hay trabajo recurrente"
            description="Configura rituales automatizados como reportes semanales, auditorías mensuales o comités trimestrales, y las tareas se generarán solas."
            action={
              <Button onClick={() => setComposer({ open: true })}>
                <Plus className="h-4 w-4" />
                Nueva tarea recurrente
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Definitions grouped by frequency */}
          <div className="space-y-6 lg:col-span-2">
            {byFrequency.map(({ freq, items }) => (
              <div key={freq}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{FREQUENCY_META[freq].label}</h2>
                  <Badge tone="muted">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((r) => (
                    <DefinitionRow
                      key={r.id}
                      r={r}
                      onToggle={() => toggleRecurring(r.id)}
                      onRun={() => runRecurringNow(r.id)}
                      onEdit={() => setComposer({ open: true, id: r.id })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming generated */}
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Próximas generadas</h2>
                <Badge tone="muted">{upcoming.length}</Badge>
              </div>
              {upcoming.length ? (
                <div className="divide-y divide-border">
                  {upcoming.map((t) => (
                    <TaskRow key={t.id} task={t} showProject={false} onOpen={() => {}} />
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No hay próximas ocurrencias programadas.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      <RecurringComposer
        open={composer.open}
        recurringId={composer.id}
        onClose={() => setComposer({ open: false })}
      />
    </div>
  );
}

/* --------------------------------------------------------------- definition row */

function DefinitionRow({
  r,
  onToggle,
  onRun,
  onEdit,
}: {
  r: RecurringTask;
  onToggle: () => void;
  onRun: () => void;
  onEdit: () => void;
}) {
  const { data } = useMos();
  const assignee = data.profiles.find((p) => p.id === r.assigneeId);
  const next = nextOccurrence(r);
  const [ran, setRan] = useState(false);

  const handleRun = () => {
    onRun();
    setRan(true);
    window.setTimeout(() => setRan(false), 2500);
  };

  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        !r.active && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold leading-snug">{r.title}</span>
          </div>
          {r.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
          )}
        </div>
        <ToggleSwitch
          on={r.active}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="muted">{deptLabel(r.department)}</Badge>
        <PriorityBadge priority={r.priority} />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {r.estimatedHours}h
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="h-3 w-3" />
          Próxima: {r.active ? format(next, "d 'de' MMM, yyyy", { locale: es }) : "En pausa"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          {assignee ? (
            <>
              <Avatar id={assignee.id} name={assignee.name} size={22} />
              <span className="truncate text-xs text-muted-foreground">{assignee.name.split(" ")[0]}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Sin asignar</span>
          )}
          {r.support && (
            <span className="truncate text-xs text-muted-foreground/70">· Apoyo: {r.support}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            disabled={ran}
            className={cn(ran && "text-success")}
            title="Crea la tarea de hoy para esta actividad recurrente"
          >
            {ran ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {ran ? "Tarea creada" : "Ejecutar ahora"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------- composer */

const blank = {
  title: "",
  description: "",
  frequency: "weekly" as Frequency,
  assigneeId: "",
  support: "",
  department: DEPARTMENTS[0],
  priority: "medium" as Priority,
  estimatedHours: "1",
  anchorDate: "",
};

function RecurringComposer({
  open,
  onClose,
  recurringId,
}: {
  open: boolean;
  onClose: () => void;
  recurringId?: string;
}) {
  const { data, me, createRecurring, updateRecurring } = useMos();
  const editing = data.recurring.find((r) => r.id === recurringId);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description,
        frequency: editing.frequency,
        assigneeId: editing.assigneeId ?? "",
        support: editing.support ?? "",
        department: editing.department,
        priority: editing.priority,
        estimatedHours: String(editing.estimatedHours),
        anchorDate: editing.anchorDate,
      });
    } else {
      setForm({ ...blank, assigneeId: me.id, department: me.department });
    }
  }, [open, editing, me.id, me.department]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description,
      frequency: form.frequency,
      assigneeId: form.assigneeId || null,
      support: form.support.trim() || undefined,
      department: form.department as Department,
      priority: form.priority,
      estimatedHours: Number(form.estimatedHours) || 0,
      anchorDate: form.anchorDate || format(new Date(), "yyyy-MM-dd"),
    };
    if (editing) updateRecurring(editing.id, payload);
    else createRecurring(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar tarea recurrente" : "Nueva tarea recurrente"}
      description="Genera tareas automáticamente con la cadencia que elijas."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{editing ? "Guardar" : "Crear recurrente"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="ej. Reporte de desempeño semanal"
            autoFocus
          />
        </Field>
        <Field label="Descripción">
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Qué cubre este ritual…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Frecuencia">
            <Select value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_META[f].label}
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
          <Field label="Apoyo / colaborador">
            <Input value={form.support} onChange={(e) => set("support", e.target.value)} placeholder="Persona o equipo (opcional)" />
          </Field>
          <Field label="Departamento">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {deptLabel(d)}
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
          <Field label="Horas estimadas">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={form.estimatedHours}
              onChange={(e) => set("estimatedHours", e.target.value)}
            />
          </Field>
          <Field label="Fecha de anclaje">
            <Input
              type="date"
              value={form.anchorDate}
              onChange={(e) => set("anchorDate", e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
