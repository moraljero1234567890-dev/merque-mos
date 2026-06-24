"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { useMos } from "@/lib/store";
import type { Meeting, Priority, Task } from "@/lib/types";
import { PRIORITY_META } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { TaskComposer, TaskRow } from "@/components/tasks";
import { Button, Card, Dot, EmptyState, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

// Map a PRIORITY_META tone → CSS color var (mirrors the Badge tone palette).
const TONE_COLOR: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
};

function priorityColor(priority: Priority): string {
  return TONE_COLOR[PRIORITY_META[priority].tone] ?? TONE_COLOR.muted;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type DayItem =
  | { kind: "task"; task: Task; color: string; label: string }
  | { kind: "meeting"; meeting: Meeting; label: string };

export default function CalendarPage() {
  const { data, me } = useMos();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [scope, setScope] = useState<"me" | "all">("me");
  const [composer, setComposer] = useState<{ open: boolean; id?: string | null }>({ open: false });
  const [dayModal, setDayModal] = useState<Date | null>(null);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Tasks visible under the current scope, keyed (loosely) for date matching.
  const scopedTasks = useMemo(
    () =>
      data.tasks.filter(
        (t) => t.dueDate && (scope === "all" || t.assigneeId === me.id),
      ),
    [data.tasks, scope, me.id],
  );

  const itemsForDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (date: Date, item: DayItem) => {
      const key = format(date, "yyyy-MM-dd");
      const arr = map.get(key);
      if (arr) arr.push(item);
      else map.set(key, [item]);
    };
    for (const t of scopedTasks) {
      push(new Date(t.dueDate as string), {
        kind: "task",
        task: t,
        color: priorityColor(t.priority),
        label: t.title,
      });
    }
    for (const m of data.meetings) {
      push(new Date(m.date), { kind: "meeting", meeting: m, label: m.title });
    }
    // Sort: meetings first, then tasks by priority rank desc.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "meeting" ? -1 : 1;
        if (a.kind === "task" && b.kind === "task")
          return PRIORITY_META[b.task.priority].rank - PRIORITY_META[a.task.priority].rank;
        return 0;
      });
    }
    return map;
  }, [scopedTasks, data.meetings]);

  const getItems = (date: Date) => itemsForDay.get(format(date, "yyyy-MM-dd")) ?? [];

  const monthStats = useMemo(() => {
    let deadlines = 0;
    let meetings = 0;
    for (const t of scopedTasks)
      if (isSameMonth(new Date(t.dueDate as string), currentMonth)) deadlines++;
    for (const m of data.meetings)
      if (isSameMonth(new Date(m.date), currentMonth)) meetings++;
    return { deadlines, meetings };
  }, [scopedTasks, data.meetings, currentMonth]);

  const totalItems = scopedTasks.length + data.meetings.length;

  const openTask = (id: string) => {
    setDayModal(null);
    setComposer({ open: true, id });
  };

  const dayItems = dayModal ? getItems(dayModal) : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Calendario"
        description="Fechas límite, trabajo recurrente y reuniones del departamento."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-semibold tabular-nums sm:inline">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <div className="inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
              Hoy
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold tabular-nums sm:hidden">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5 text-sm">
          {(["me", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
                scope === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "me" ? "Mis ítems" : "Todos"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground sm:ml-auto">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {monthStats.deadlines} {monthStats.deadlines === 1 ? "fecha límite" : "fechas límite"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {monthStats.meetings} {monthStats.meetings === 1 ? "reunión" : "reuniones"}
          </span>
        </div>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="Nada programado"
          description="Las tareas con fecha límite y las reuniones aparecerán aquí a medida que planifiques el trabajo."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface/50">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const items = getItems(day);
              const outside = !isSameMonth(day, currentMonth);
              const today = isToday(day);
              const visible = items.slice(0, 3);
              const overflow = items.length - visible.length;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setDayModal(day)}
                  className={cn(
                    "flex min-h-[88px] flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/40 sm:min-h-[116px] sm:p-2",
                    outside && "bg-surface/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                        today && "bg-primary text-primary-foreground",
                        !today && outside && "text-muted-foreground/50",
                        !today && !outside && "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 overflow-hidden">
                    {visible.map((item, i) =>
                      item.kind === "meeting" ? (
                        <span
                          key={`m-${item.meeting.id}-${i}`}
                          className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                          title={item.label}
                        >
                          <Dot color="var(--primary)" />
                          <span className="hidden truncate sm:inline">{item.label}</span>
                        </span>
                      ) : (
                        <span
                          key={`t-${item.task.id}-${i}`}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-foreground",
                            item.task.status === "done"
                              ? "bg-muted text-muted-foreground line-through"
                              : "bg-muted/60",
                          )}
                          title={item.label}
                        >
                          <Dot color={item.color} />
                          <span className="hidden truncate sm:inline">{item.label}</span>
                        </span>
                      ),
                    )}
                    {overflow > 0 && (
                      <span className="px-1.5 text-[10px] font-medium text-muted-foreground">
                        +{overflow} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Convenciones</span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color="var(--primary)" /> Reuniones
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={priorityColor("urgent")} /> {PRIORITY_META.urgent.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={priorityColor("high")} /> {PRIORITY_META.high.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={priorityColor("medium")} /> {PRIORITY_META.medium.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot color={priorityColor("low")} /> {PRIORITY_META.low.label}
        </span>
      </div>

      {/* Day detail modal */}
      <Modal
        open={dayModal !== null}
        onClose={() => setDayModal(null)}
        title={dayModal ? format(dayModal, "EEEE, d 'de' MMMM", { locale: es }) : undefined}
        description={
          dayModal
            ? `${dayItems.filter((i) => i.kind === "task").length} ${
                dayItems.filter((i) => i.kind === "task").length === 1 ? "tarea" : "tareas"
              } · ${dayItems.filter((i) => i.kind === "meeting").length} ${
                dayItems.filter((i) => i.kind === "meeting").length === 1 ? "reunión" : "reuniones"
              }`
            : undefined
        }
      >
        {dayItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nada programado este día.</p>
        ) : (
          <div className="space-y-5">
            {dayItems.some((i) => i.kind === "meeting") && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Reuniones
                </div>
                <div className="space-y-2">
                  {dayItems
                    .filter((i): i is Extract<DayItem, { kind: "meeting" }> => i.kind === "meeting")
                    .map((i) => (
                      <div
                        key={i.meeting.id}
                        className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{i.meeting.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.meeting.attendeeIds.length} {i.meeting.attendeeIds.length === 1 ? "asistente" : "asistentes"}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(i.meeting.date), "HH:mm")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {dayItems.some((i) => i.kind === "task") && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tareas
                </div>
                <Card className="divide-y divide-border overflow-hidden">
                  {dayItems
                    .filter((i): i is Extract<DayItem, { kind: "task" }> => i.kind === "task")
                    .map((i) => (
                      <TaskRow key={i.task.id} task={i.task} onOpen={openTask} />
                    ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </Modal>

      <TaskComposer
        open={composer.open}
        taskId={composer.id}
        onClose={() => setComposer({ open: false })}
      />
    </div>
  );
}
