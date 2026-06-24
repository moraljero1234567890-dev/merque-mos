"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Plus,
} from "lucide-react";
import { useMos } from "@/lib/store";
import type { Meeting } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";

export default function MeetingsPage() {
  return (
    <Suspense fallback={null}>
      <MeetingsInner />
    </Suspense>
  );
}

function MeetingsInner() {
  const params = useSearchParams();
  const { data } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string }>({ open: false });
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("new")) setComposer({ open: true });
    const id = params.get("id");
    if (id) setDetail(id);
  }, [params]);

  const meetings = useMemo(
    () =>
      [...data.meetings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [data.meetings],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reuniones"
        description="Agendas, notas, decisiones y compromisos — capturados y convertidos en trabajo."
        actions={
          <Button onClick={() => setComposer({ open: true })}>
            <Plus className="h-4 w-4" />
            Registrar reunión
          </Button>
        }
      />

      {meetings.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} onOpen={setDetail} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="h-5 w-5" />}
          title="Aún no hay reuniones registradas"
          description="Captura una agenda, notas y decisiones — luego convierte los compromisos en tareas con seguimiento."
          action={
            <Button onClick={() => setComposer({ open: true })}>
              <Plus className="h-4 w-4" />
              Registrar reunión
            </Button>
          }
        />
      )}

      <MeetingComposer
        open={composer.open}
        meetingId={composer.id}
        onClose={() => setComposer({ open: false })}
      />
      <MeetingDetail
        meetingId={detail}
        onClose={() => setDetail(null)}
        onEdit={(id) => {
          setDetail(null);
          setComposer({ open: true, id });
        }}
      />
    </div>
  );
}

function MeetingCard({
  meeting,
  onOpen,
}: {
  meeting: Meeting;
  onOpen: (id: string) => void;
}) {
  const { data } = useMos();
  const attendees = meeting.attendeeIds
    .map((id) => data.profiles.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const actionCount = data.meetingActions.filter((a) => a.meetingId === meeting.id).length;

  return (
    <button
      onClick={() => onOpen(meeting.id)}
      className="group flex w-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-all hover:border-border-strong hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug">{meeting.title}</span>
        {attendees.length > 0 && <AvatarStack users={attendees} size={22} max={4} />}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {format(new Date(meeting.date), "EEE d MMM · HH:mm", { locale: es })}
      </div>
      {meeting.notes.trim() && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{meeting.notes}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="info">
          <ListChecks className="h-3 w-3" />
          {meeting.decisions.length} decisi{meeting.decisions.length === 1 ? "ón" : "ones"}
        </Badge>
        <Badge tone="primary">
          <ClipboardList className="h-3 w-3" />
          {actionCount} compromiso{actionCount === 1 ? "" : "s"}
        </Badge>
      </div>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function MeetingDetail({
  meetingId,
  onClose,
  onEdit,
}: {
  meetingId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const { data, addMeetingAction, convertActionToTask } = useMos();
  const meeting = data.meetings.find((m) => m.id === meetingId);

  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");

  if (!meeting) return null;

  const attendees = meeting.attendeeIds
    .map((id) => data.profiles.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const actions = data.meetingActions.filter((a) => a.meetingId === meeting.id);

  const addAction = () => {
    if (!desc.trim()) return;
    addMeetingAction({
      meetingId: meeting.id,
      description: desc.trim(),
      assigneeId: assignee || null,
      dueDate: due || null,
    });
    setDesc("");
    setAssignee("");
    setDue("");
  };

  return (
    <Modal
      open={!!meetingId}
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="outline" onClick={() => onEdit(meeting.id)}>
          Editar reunión
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {format(new Date(meeting.date), "EEE d MMM · HH:mm", { locale: es })}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{meeting.title}</h2>
        </div>

        {attendees.length > 0 && (
          <Section title="Asistentes">
            <div className="flex flex-wrap gap-2">
              {attendees.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 py-0.5 pl-0.5 pr-2.5 text-xs"
                >
                  <Avatar id={p.id} name={p.name} size={20} />
                  {p.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {meeting.agenda.trim() && (
          <Section title="Agenda">
            <p className="whitespace-pre-line rounded-lg border border-border bg-surface/50 p-3 text-sm text-muted-foreground">
              {meeting.agenda}
            </p>
          </Section>
        )}

        {meeting.notes.trim() && (
          <Section title="Notas">
            <p className="whitespace-pre-line rounded-lg border border-border bg-surface/50 p-3 text-sm text-muted-foreground">
              {meeting.notes}
            </p>
          </Section>
        )}

        {meeting.decisions.length > 0 && (
          <Section title="Decisiones">
            <ul className="space-y-1.5">
              {meeting.decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Compromisos">
          <div className="overflow-hidden rounded-lg border border-border">
            {actions.length ? (
              <div className="divide-y divide-border">
                {actions.map((a) => {
                  const who = data.profiles.find((p) => p.id === a.assigneeId);
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{a.description}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {who && (
                            <span className="inline-flex items-center gap-1">
                              <Avatar id={who.id} name={who.name} size={16} />
                              {who.name.split(" ")[0]}
                            </span>
                          )}
                          {a.dueDate && <span>Vence {format(new Date(a.dueDate), "d MMM", { locale: es })}</span>}
                        </div>
                      </div>
                      {a.taskId ? (
                        <Badge tone="success">
                          <Check className="h-3 w-3" />
                          Tarea creada
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => convertActionToTask(a.id)}>
                          Convertir en tarea
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aún no hay compromisos.</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Agregar un compromiso…"
              onKeyDown={(e) => e.key === "Enter" && addAction()}
            />
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Sin asignar</option>
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="sm:w-40"
            />
            <Button size="sm" onClick={addAction} disabled={!desc.trim()}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </Section>
      </div>
    </Modal>
  );
}

const blank = {
  title: "",
  date: "",
  attendeeIds: [] as string[],
  agenda: "",
  notes: "",
  decisions: "",
};

function MeetingComposer({
  open,
  onClose,
  meetingId,
}: {
  open: boolean;
  onClose: () => void;
  meetingId?: string;
}) {
  const { data, me, createMeeting, updateMeeting } = useMos();
  const editing = data.meetings.find((m) => m.id === meetingId);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        date: editing.date.slice(0, 16),
        attendeeIds: editing.attendeeIds,
        agenda: editing.agenda,
        notes: editing.notes,
        decisions: editing.decisions.join("\n"),
      });
    } else {
      setForm({
        ...blank,
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        attendeeIds: [me.id],
      });
    }
  }, [open, editing, me.id]);

  const toggleAttendee = (id: string) =>
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id)
        ? f.attendeeIds.filter((x) => x !== id)
        : [...f.attendeeIds, id],
    }));

  const save = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      attendeeIds: form.attendeeIds,
      agenda: form.agenda,
      notes: form.notes,
      decisions: form.decisions
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean),
    };
    if (editing) updateMeeting(editing.id, payload);
    else createMeeting(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar reunión" : "Registrar reunión"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{editing ? "Guardar" : "Registrar reunión"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="p. ej. Sync semanal de marketing"
            autoFocus
          />
        </Field>
        <Field label="Fecha y hora">
          <Input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </Field>
        <Field label="Asistentes">
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-surface/50 p-2 sm:grid-cols-3">
            {data.profiles.map((p) => {
              const checked = form.attendeeIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAttendee(p.id)}
                    className="h-3.5 w-3.5 accent-[var(--primary)]"
                  />
                  <Avatar id={p.id} name={p.name} size={20} />
                  <span className="truncate">{p.name.split(" ")[0]}</span>
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="Agenda">
          <Textarea
            value={form.agenda}
            onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
            placeholder="Un tema por línea…"
          />
        </Field>
        <Field label="Notas">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Field>
        <Field label="Decisiones — una por línea">
          <Textarea
            value={form.decisions}
            onChange={(e) => setForm((f) => ({ ...f, decisions: e.target.value }))}
            placeholder="Cada línea se convierte en una decisión"
          />
        </Field>
      </div>
    </Modal>
  );
}
