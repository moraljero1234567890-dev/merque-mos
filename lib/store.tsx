"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatISO } from "date-fns";
import { buildSeed } from "./seed";
import { generateOccurrences } from "./recurring";
import { uid } from "./utils";
import type {
  Announcement,
  Document,
  Kpi,
  KpiUpdate,
  Meeting,
  MeetingAction,
  MosData,
  Project,
  RecurringTask,
  Task,
  TaskComment,
  TaskStatus,
} from "./types";

const STORAGE_KEY = "mos:data:v1";
const USER_KEY = "mos:user:v1";

function hydrate(): MosData {
  const seed = buildSeed();
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MosData;
        // Top up recurring occurrences since last visit.
        const fresh = generateOccurrences(parsed.recurring, parsed.tasks);
        parsed.tasks = [...parsed.tasks, ...fresh];
        return parsed;
      }
    } catch {
      /* fall through to seed */
    }
  }
  const occ = generateOccurrences(seed.recurring, seed.tasks);
  seed.tasks = [...seed.tasks, ...occ];
  return seed;
}

interface MosContextValue {
  data: MosData;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  me: MosData["profiles"][number];
  isAdmin: boolean;

  // tasks
  createTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  addComment: (taskId: string, body: string) => void;

  // projects
  createProject: (input: Partial<Project> & { name: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;

  // recurring
  createRecurring: (input: Partial<RecurringTask> & { title: string }) => void;
  updateRecurring: (id: string, patch: Partial<RecurringTask>) => void;
  toggleRecurring: (id: string) => void;
  runRecurringNow: (id: string) => void;

  // meetings
  createMeeting: (input: Partial<Meeting> & { title: string }) => Meeting;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  addMeetingAction: (input: Omit<MeetingAction, "id" | "taskId">) => void;
  convertActionToTask: (actionId: string) => void;

  // kpis
  addKpiUpdate: (kpiId: string, value: number, note?: string) => void;

  // docs
  createDocument: (input: Partial<Document> & { name: string; type: Document["type"] }) => void;
  deleteDocument: (id: string) => void;

  // announcements & notifications
  createAnnouncement: (title: string, body: string, pinned?: boolean) => void;
  markAllNotificationsRead: () => void;

  resetDemo: () => void;
}

const MosContext = createContext<MosContextValue | null>(null);

export function MosProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MosData | null>(null);
  const [currentUserId, setCurrentUserIdState] = useState("u1");
  const persistRef = useRef<number | null>(null);

  useEffect(() => {
    const d = hydrate();
    setData(d);
    try {
      const u = window.localStorage.getItem(USER_KEY);
      if (u && d.profiles.some((p) => p.id === u)) setCurrentUserIdState(u);
    } catch {
      /* noop */
    }
  }, []);

  // Debounced persistence.
  useEffect(() => {
    if (!data) return;
    if (persistRef.current) window.clearTimeout(persistRef.current);
    persistRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* quota / private mode */
      }
    }, 250);
  }, [data]);

  const setCurrentUserId = (id: string) => {
    setCurrentUserIdState(id);
    try {
      window.localStorage.setItem(USER_KEY, id);
    } catch {
      /* noop */
    }
  };

  const value = useMemo<MosContextValue | null>(() => {
    if (!data) return null;
    const me = data.profiles.find((p) => p.id === currentUserId) ?? data.profiles[0];
    const now = () => formatISO(new Date());

    const log = (
      d: MosData,
      action: string,
      entityType: string,
      entityId: string,
      summary: string,
    ): MosData => ({
      ...d,
      activity: [
        {
          id: uid("ac"),
          actorId: currentUserId,
          action,
          entityType,
          entityId,
          summary,
          createdAt: now(),
        },
        ...d.activity,
      ].slice(0, 200),
    });

    const createTask: MosContextValue["createTask"] = (input) => {
      const task: Task = {
        id: uid("t"),
        title: input.title,
        description: input.description ?? "",
        assigneeId: input.assigneeId ?? currentUserId,
        projectId: input.projectId ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        estimatedHours: input.estimatedHours ?? 1,
        actualHours: input.actualHours ?? 0,
        notes: input.notes,
        attachments: input.attachments ?? [],
        recurringId: input.recurringId ?? null,
        meetingId: input.meetingId ?? null,
        createdAt: now(),
        completedAt: null,
      };
      setData((d) => (d ? log({ ...d, tasks: [task, ...d.tasks] }, "created", "task", task.id, `created “${task.title}”`) : d));
      return task;
    };

    const updateTask: MosContextValue["updateTask"] = (id, patch) => {
      setData((d) =>
        d
          ? {
              ...d,
              tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            }
          : d,
      );
    };

    const moveTask: MosContextValue["moveTask"] = (id, status) => {
      setData((d) => {
        if (!d) return d;
        const tasks = d.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                completedAt: status === "done" ? now() : null,
                actualHours:
                  status === "done" && t.actualHours === 0
                    ? t.estimatedHours
                    : t.actualHours,
              }
            : t,
        );
        const t = tasks.find((x) => x.id === id);
        return log({ ...d, tasks }, "updated", "task", id, `moved “${t?.title}” to ${status.replace("_", " ")}`);
      });
    };

    const deleteTask: MosContextValue["deleteTask"] = (id) => {
      setData((d) => (d ? { ...d, tasks: d.tasks.filter((t) => t.id !== id) } : d));
    };

    const addComment: MosContextValue["addComment"] = (taskId, body) => {
      const c: TaskComment = { id: uid("c"), taskId, authorId: currentUserId, body, createdAt: now() };
      setData((d) => (d ? log({ ...d, comments: [...d.comments, c] }, "commented", "task", taskId, "added a comment") : d));
    };

    const createProject: MosContextValue["createProject"] = (input) => {
      const project: Project = {
        id: uid("p"),
        name: input.name,
        description: input.description ?? "",
        ownerId: input.ownerId ?? currentUserId,
        status: input.status ?? "planning",
        priority: input.priority ?? "medium",
        startDate: input.startDate ?? formatISO(new Date(), { representation: "date" }),
        dueDate: input.dueDate ?? formatISO(new Date(), { representation: "date" }),
        department: input.department ?? me.department,
        progress: input.progress ?? 0,
        createdAt: now(),
      };
      setData((d) => (d ? log({ ...d, projects: [project, ...d.projects] }, "created", "project", project.id, `created project “${project.name}”`) : d));
      return project;
    };

    const updateProject: MosContextValue["updateProject"] = (id, patch) => {
      setData((d) => (d ? { ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d));
    };

    const createRecurring: MosContextValue["createRecurring"] = (input) => {
      const r: RecurringTask = {
        id: uid("r"),
        title: input.title,
        description: input.description ?? "",
        frequency: input.frequency ?? "monthly",
        assigneeId: input.assigneeId ?? currentUserId,
        estimatedHours: input.estimatedHours ?? 2,
        priority: input.priority ?? "medium",
        department: input.department ?? me.department,
        anchorDate: input.anchorDate ?? formatISO(new Date(), { representation: "date" }),
        active: input.active ?? true,
      };
      setData((d) => {
        if (!d) return d;
        const occ = generateOccurrences([r], d.tasks);
        return log({ ...d, recurring: [r, ...d.recurring], tasks: [...d.tasks, ...occ] }, "created", "recurring", r.id, `created recurring “${r.title}”`);
      });
    };

    const updateRecurring: MosContextValue["updateRecurring"] = (id, patch) => {
      setData((d) => (d ? { ...d, recurring: d.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : d));
    };

    const toggleRecurring: MosContextValue["toggleRecurring"] = (id) => {
      setData((d) => (d ? { ...d, recurring: d.recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) } : d));
    };

    const runRecurringNow: MosContextValue["runRecurringNow"] = (id) => {
      setData((d) => {
        if (!d) return d;
        const r = d.recurring.find((x) => x.id === id);
        if (!r) return d;
        const occ = generateOccurrences([r], d.tasks, { pastDays: 0, futureDays: 0 });
        return { ...d, tasks: [...d.tasks, ...occ] };
      });
    };

    const createMeeting: MosContextValue["createMeeting"] = (input) => {
      const m: Meeting = {
        id: uid("m"),
        title: input.title,
        date: input.date ?? now(),
        attendeeIds: input.attendeeIds ?? [currentUserId],
        agenda: input.agenda ?? "",
        notes: input.notes ?? "",
        decisions: input.decisions ?? [],
        createdAt: now(),
      };
      setData((d) => (d ? log({ ...d, meetings: [m, ...d.meetings] }, "created", "meeting", m.id, `logged meeting “${m.title}”`) : d));
      return m;
    };

    const updateMeeting: MosContextValue["updateMeeting"] = (id, patch) => {
      setData((d) => (d ? { ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : d));
    };

    const addMeetingAction: MosContextValue["addMeetingAction"] = (input) => {
      const a: MeetingAction = { ...input, id: uid("ma"), taskId: null };
      setData((d) => (d ? { ...d, meetingActions: [...d.meetingActions, a] } : d));
    };

    const convertActionToTask: MosContextValue["convertActionToTask"] = (actionId) => {
      setData((d) => {
        if (!d) return d;
        const a = d.meetingActions.find((x) => x.id === actionId);
        if (!a || a.taskId) return d;
        const task: Task = {
          id: uid("t"),
          title: a.description,
          assigneeId: a.assigneeId,
          projectId: null,
          status: "todo",
          priority: "medium",
          dueDate: a.dueDate,
          estimatedHours: 1,
          actualHours: 0,
          attachments: [],
          meetingId: a.meetingId,
          createdAt: now(),
          completedAt: null,
        };
        return log(
          {
            ...d,
            tasks: [task, ...d.tasks],
            meetingActions: d.meetingActions.map((x) => (x.id === actionId ? { ...x, taskId: task.id } : x)),
          },
          "created",
          "task",
          task.id,
          `converted action item to task “${task.title}”`,
        );
      });
    };

    const addKpiUpdate: MosContextValue["addKpiUpdate"] = (kpiId, value, note) => {
      const u: KpiUpdate = { id: uid("ku"), kpiId, value, date: formatISO(new Date(), { representation: "date" }), note };
      setData((d) => {
        if (!d) return d;
        const kpis = d.kpis.map((k) => (k.id === kpiId ? { ...k, current: value, updatedAt: now() } : k));
        const k = kpis.find((x) => x.id === kpiId);
        return log({ ...d, kpis, kpiUpdates: [...d.kpiUpdates, u] }, "updated", "kpi", kpiId, `updated ${k?.name} to ${value}`);
      });
    };

    const createDocument: MosContextValue["createDocument"] = (input) => {
      const doc: Document = {
        id: uid("doc"),
        name: input.name,
        type: input.type,
        parentId: input.parentId ?? null,
        fileKind: input.fileKind,
        ownerId: currentUserId,
        size: input.size,
        url: input.url,
        updatedAt: now(),
      };
      setData((d) => (d ? { ...d, documents: [...d.documents, doc] } : d));
    };

    const deleteDocument: MosContextValue["deleteDocument"] = (id) => {
      setData((d) =>
        d ? { ...d, documents: d.documents.filter((x) => x.id !== id && x.parentId !== id) } : d,
      );
    };

    const createAnnouncement: MosContextValue["createAnnouncement"] = (title, body, pinned = false) => {
      const a: Announcement = { id: uid("a"), authorId: currentUserId, title, body, pinned, createdAt: now() };
      setData((d) => (d ? log({ ...d, announcements: [a, ...d.announcements] }, "created", "announcement", a.id, `posted “${title}”`) : d));
    };

    const markAllNotificationsRead: MosContextValue["markAllNotificationsRead"] = () => {
      setData((d) =>
        d ? { ...d, notifications: d.notifications.map((n) => (n.userId === currentUserId ? { ...n, read: true } : n)) } : d,
      );
    };

    const resetDemo = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      setData(hydrate());
    };

    return {
      data,
      currentUserId,
      setCurrentUserId,
      me,
      isAdmin: me.role === "admin",
      createTask,
      updateTask,
      moveTask,
      deleteTask,
      addComment,
      createProject,
      updateProject,
      createRecurring,
      updateRecurring,
      toggleRecurring,
      runRecurringNow,
      createMeeting,
      updateMeeting,
      addMeetingAction,
      convertActionToTask,
      addKpiUpdate,
      createDocument,
      deleteDocument,
      createAnnouncement,
      markAllNotificationsRead,
      resetDemo,
    };
  }, [data, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!value) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return <MosContext.Provider value={value}>{children}</MosContext.Provider>;
}

export function useMos() {
  const ctx = useContext(MosContext);
  if (!ctx) throw new Error("useMos must be used within MosProvider");
  return ctx;
}
