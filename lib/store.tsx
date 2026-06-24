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
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSeed } from "./seed";
import { generateOccurrences } from "./recurring";
import { uid } from "./utils";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import {
  addCategory,
  deleteRow,
  loadAll,
  removeCategory,
  saveRow,
} from "./supabase/data";
import { setPassword as setDemoPassword } from "./demo-auth";
import type {
  Announcement,
  BudgetLine,
  Document,
  InventoryItem,
  Kpi,
  KpiUpdate,
  Meeting,
  MeetingAction,
  MosData,
  Project,
  RecurringTask,
  SocialSnapshot,
  Supplier,
  Task,
  TaskComment,
  TaskStatus,
} from "./types";

// v3 — Merquellantas team (@merquellantas.com), revised recurring catalog with
// support/priority, and finance categories. Bumping retires stale cached data.
const STORAGE_KEY = "mos:data:v3";
const USER_KEY = "mos:user:v1";

function hydrate(): MosData {
  const seed = buildSeed();
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MosData;
        // Forward-compatible defaults for fields added after this blob was saved.
        parsed.budgets = parsed.budgets ?? [];
        parsed.financeCategories = parsed.financeCategories ?? [];
        parsed.socialSnapshots = parsed.socialSnapshots ?? [];
        parsed.suppliers = parsed.suppliers ?? [];
        parsed.inventory = parsed.inventory ?? [];
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
  live: boolean; // true when backed by Supabase (vs local demo)

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

  // budget / finance
  createBudget: (input: Partial<BudgetLine> & { concept: string }) => void;
  updateBudget: (id: string, patch: Partial<BudgetLine>) => void;
  deleteBudget: (id: string) => void;
  addFinanceCategory: (name: string) => void;
  removeFinanceCategory: (name: string) => void;

  // social
  addSocialSnapshot: (input: Partial<SocialSnapshot>) => void;
  deleteSocialSnapshot: (id: string) => void;

  // inventory & suppliers
  createSupplier: (input: Partial<Supplier> & { name: string }) => Supplier;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  createInventoryItem: (input: Partial<InventoryItem> & { name: string }) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;

  // account
  changeMyPassword: (newPassword: string) => Promise<{ error?: string }>;

  resetDemo: () => void;
}

const MosContext = createContext<MosContextValue | null>(null);

export function MosProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MosData | null>(null);
  const [currentUserId, setCurrentUserIdState] = useState("u1");
  const persistRef = useRef<number | null>(null);
  const sbRef = useRef<SupabaseClient | null>(null);
  const liveRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      // Live mode — load the workspace from Supabase for the signed-in user.
      if (isSupabaseConfigured()) {
        const sb = createClient();
        if (sb) {
          const {
            data: { session },
          } = await sb.auth.getSession();
          if (session) {
            try {
              const { data: meRow } = await sb
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();
              const admin = meRow?.role === "admin";
              const loaded = await loadAll(sb, session.user.id, admin);
              const occ = generateOccurrences(loaded.recurring, loaded.tasks);
              loaded.tasks = [...loaded.tasks, ...occ];
              if (!mounted) return;
              sbRef.current = sb;
              liveRef.current = true;
              setCurrentUserIdState(session.user.id);
              setData(loaded);
              return;
            } catch (e) {
              console.warn("[mos] Supabase load failed, falling back to demo:", e);
            }
          }
        }
      }

      // Demo mode — local seed/localStorage.
      const d = hydrate();
      if (!mounted) return;
      setData(d);
      try {
        const u = window.localStorage.getItem(USER_KEY);
        if (u && d.profiles.some((p) => p.id === u)) setCurrentUserIdState(u);
      } catch {
        /* noop */
      }
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced persistence — demo mode only (live data lives in Supabase).
  useEffect(() => {
    if (!data || liveRef.current) return;
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
    if (liveRef.current) return; // identity is fixed by the Supabase session
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

    // Write-through to Supabase (no-op in demo mode; skips in-memory rows).
    const sb = sbRef.current;
    const save = (key: string, row: object) => {
      if (sb) saveRow(sb, key, row as Record<string, unknown>);
    };
    const del = (key: string, id: string) => {
      if (sb) deleteRow(sb, key, id);
    };

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
      save("tasks", task);
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
      const cur = data.tasks.find((t) => t.id === id);
      if (cur) save("tasks", { ...cur, ...patch });
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
      const cur = data.tasks.find((t) => t.id === id);
      if (cur)
        save("tasks", {
          ...cur,
          status,
          completedAt: status === "done" ? now() : null,
          actualHours:
            status === "done" && cur.actualHours === 0 ? cur.estimatedHours : cur.actualHours,
        });
    };

    const deleteTask: MosContextValue["deleteTask"] = (id) => {
      setData((d) => (d ? { ...d, tasks: d.tasks.filter((t) => t.id !== id) } : d));
      del("tasks", id);
    };

    const addComment: MosContextValue["addComment"] = (taskId, body) => {
      const c: TaskComment = { id: uid("c"), taskId, authorId: currentUserId, body, createdAt: now() };
      setData((d) => (d ? log({ ...d, comments: [...d.comments, c] }, "commented", "task", taskId, "added a comment") : d));
      save("comments", c);
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
      save("projects", project);
      return project;
    };

    const updateProject: MosContextValue["updateProject"] = (id, patch) => {
      setData((d) => (d ? { ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d));
      const cur = data.projects.find((p) => p.id === id);
      if (cur) save("projects", { ...cur, ...patch });
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
      save("recurring", r);
    };

    const updateRecurring: MosContextValue["updateRecurring"] = (id, patch) => {
      setData((d) => (d ? { ...d, recurring: d.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : d));
      const cur = data.recurring.find((r) => r.id === id);
      if (cur) save("recurring", { ...cur, ...patch });
    };

    const toggleRecurring: MosContextValue["toggleRecurring"] = (id) => {
      setData((d) => (d ? { ...d, recurring: d.recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) } : d));
      const cur = data.recurring.find((r) => r.id === id);
      if (cur) save("recurring", { ...cur, active: !cur.active });
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
      save("meetings", m);
      return m;
    };

    const updateMeeting: MosContextValue["updateMeeting"] = (id, patch) => {
      setData((d) => (d ? { ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : d));
      const cur = data.meetings.find((m) => m.id === id);
      if (cur) save("meetings", { ...cur, ...patch });
    };

    const addMeetingAction: MosContextValue["addMeetingAction"] = (input) => {
      const a: MeetingAction = { ...input, id: uid("ma"), taskId: null };
      setData((d) => (d ? { ...d, meetingActions: [...d.meetingActions, a] } : d));
      save("meetingActions", a);
    };

    const convertActionToTask: MosContextValue["convertActionToTask"] = (actionId) => {
      const a = data.meetingActions.find((x) => x.id === actionId);
      if (!a || a.taskId) return;
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
      setData((d) =>
        d
          ? log(
              {
                ...d,
                tasks: [task, ...d.tasks],
                meetingActions: d.meetingActions.map((x) => (x.id === actionId ? { ...x, taskId: task.id } : x)),
              },
              "created",
              "task",
              task.id,
              `converted action item to task “${task.title}”`,
            )
          : d,
      );
      save("tasks", task);
      save("meetingActions", { ...a, taskId: task.id });
    };

    const addKpiUpdate: MosContextValue["addKpiUpdate"] = (kpiId, value, note) => {
      const u: KpiUpdate = { id: uid("ku"), kpiId, value, date: formatISO(new Date(), { representation: "date" }), note };
      setData((d) => {
        if (!d) return d;
        const kpis = d.kpis.map((k) => (k.id === kpiId ? { ...k, current: value, updatedAt: now() } : k));
        const k = kpis.find((x) => x.id === kpiId);
        return log({ ...d, kpis, kpiUpdates: [...d.kpiUpdates, u] }, "updated", "kpi", kpiId, `updated ${k?.name} to ${value}`);
      });
      save("kpiUpdates", u);
      const k = data.kpis.find((x) => x.id === kpiId);
      if (k) save("kpis", { ...k, current: value, updatedAt: now() });
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
      save("documents", doc);
    };

    const deleteDocument: MosContextValue["deleteDocument"] = (id) => {
      setData((d) =>
        d ? { ...d, documents: d.documents.filter((x) => x.id !== id && x.parentId !== id) } : d,
      );
      del("documents", id); // children cascade in the DB via parent_id FK
    };

    const createAnnouncement: MosContextValue["createAnnouncement"] = (title, body, pinned = false) => {
      const a: Announcement = { id: uid("a"), authorId: currentUserId, title, body, pinned, createdAt: now() };
      setData((d) => (d ? log({ ...d, announcements: [a, ...d.announcements] }, "created", "announcement", a.id, `posted “${title}”`) : d));
      save("announcements", a);
    };

    const markAllNotificationsRead: MosContextValue["markAllNotificationsRead"] = () => {
      setData((d) =>
        d ? { ...d, notifications: d.notifications.map((n) => (n.userId === currentUserId ? { ...n, read: true } : n)) } : d,
      );
      if (sb) void sb.from("notifications").update({ read: true }).eq("user_id", currentUserId);
    };

    const createBudget: MosContextValue["createBudget"] = (input) => {
      const line: BudgetLine = {
        id: uid("b"),
        kind: input.kind ?? "expense",
        concept: input.concept,
        department: input.department ?? me.department,
        category: input.category ?? "Otros",
        month: input.month ?? formatISO(new Date(), { representation: "date" }).slice(0, 7),
        planned: input.planned ?? 0,
        actual: input.actual ?? 0,
        ownerId: input.ownerId ?? currentUserId,
        note: input.note,
        createdAt: now(),
      };
      setData((d) => (d ? log({ ...d, budgets: [line, ...d.budgets] }, "created", "budget", line.id, `agregó presupuesto “${line.concept}”`) : d));
      save("budgets", line);
    };

    const updateBudget: MosContextValue["updateBudget"] = (id, patch) => {
      setData((d) => (d ? { ...d, budgets: d.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : d));
      const cur = data.budgets.find((b) => b.id === id);
      if (cur) save("budgets", { ...cur, ...patch });
    };

    const deleteBudget: MosContextValue["deleteBudget"] = (id) => {
      setData((d) => (d ? { ...d, budgets: d.budgets.filter((b) => b.id !== id) } : d));
      del("budgets", id);
    };

    const addFinanceCategory: MosContextValue["addFinanceCategory"] = (name) => {
      const n = name.trim();
      if (!n) return;
      setData((d) =>
        d && !d.financeCategories.includes(n)
          ? { ...d, financeCategories: [...d.financeCategories, n] }
          : d,
      );
      if (sb) addCategory(sb, n);
    };

    const removeFinanceCategory: MosContextValue["removeFinanceCategory"] = (name) => {
      setData((d) => (d ? { ...d, financeCategories: d.financeCategories.filter((c) => c !== name) } : d));
      if (sb) removeCategory(sb, name);
    };

    const addSocialSnapshot: MosContextValue["addSocialSnapshot"] = (input) => {
      const snap: SocialSnapshot = {
        id: uid("ss"),
        platform: input.platform ?? "instagram",
        handle: input.handle ?? "merquellantas_sas",
        capturedAt: input.capturedAt ?? now(),
        followers: input.followers ?? 0,
        posts: input.posts ?? 0,
        avgLikes: input.avgLikes ?? 0,
        avgComments: input.avgComments ?? 0,
        engagementRate: input.engagementRate ?? 0,
        source: input.source ?? "manual",
      };
      setData((d) => (d ? { ...d, socialSnapshots: [snap, ...d.socialSnapshots] } : d));
      save("socialSnapshots", snap);
    };

    const deleteSocialSnapshot: MosContextValue["deleteSocialSnapshot"] = (id) => {
      setData((d) => (d ? { ...d, socialSnapshots: d.socialSnapshots.filter((s) => s.id !== id) } : d));
      del("socialSnapshots", id);
    };

    const createSupplier: MosContextValue["createSupplier"] = (input) => {
      const s: Supplier = {
        id: uid("sup"),
        name: input.name,
        contact: input.contact,
        category: input.category,
        notes: input.notes,
        createdAt: now(),
      };
      setData((d) => (d ? { ...d, suppliers: [s, ...d.suppliers] } : d));
      save("suppliers", s);
      return s;
    };

    const updateSupplier: MosContextValue["updateSupplier"] = (id, patch) => {
      setData((d) => (d ? { ...d, suppliers: d.suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d));
      const cur = data.suppliers.find((s) => s.id === id);
      if (cur) save("suppliers", { ...cur, ...patch });
    };

    const deleteSupplier: MosContextValue["deleteSupplier"] = (id) => {
      setData((d) =>
        d
          ? {
              ...d,
              suppliers: d.suppliers.filter((s) => s.id !== id),
              inventory: d.inventory.map((i) => (i.supplierId === id ? { ...i, supplierId: null } : i)),
            }
          : d,
      );
      del("suppliers", id);
    };

    const createInventoryItem: MosContextValue["createInventoryItem"] = (input) => {
      const item: InventoryItem = {
        id: uid("inv"),
        name: input.name,
        category: input.category ?? "Otros",
        quantity: input.quantity ?? 0,
        unit: input.unit ?? "unidades",
        location: input.location ?? "",
        unitCost: input.unitCost ?? 0,
        supplierId: input.supplierId ?? null,
        sku: input.sku,
        notes: input.notes,
        createdAt: now(),
        updatedAt: now(),
      };
      setData((d) => (d ? log({ ...d, inventory: [item, ...d.inventory] }, "created", "inventory", item.id, `agregó al inventario “${item.name}”`) : d));
      save("inventory", item);
    };

    const updateInventoryItem: MosContextValue["updateInventoryItem"] = (id, patch) => {
      const next = { ...patch, updatedAt: now() };
      setData((d) => (d ? { ...d, inventory: d.inventory.map((i) => (i.id === id ? { ...i, ...next } : i)) } : d));
      const cur = data.inventory.find((i) => i.id === id);
      if (cur) save("inventory", { ...cur, ...next });
    };

    const deleteInventoryItem: MosContextValue["deleteInventoryItem"] = (id) => {
      setData((d) => (d ? { ...d, inventory: d.inventory.filter((i) => i.id !== id) } : d));
      del("inventory", id);
    };

    const changeMyPassword: MosContextValue["changeMyPassword"] = async (newPassword) => {
      if (newPassword.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
      if (sb) {
        const { error } = await sb.auth.updateUser({ password: newPassword });
        return error ? { error: error.message } : {};
      }
      // Demo mode — store against the current user's email.
      setDemoPassword(me.email, newPassword);
      return {};
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
      live: liveRef.current,
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
      createBudget,
      updateBudget,
      deleteBudget,
      addFinanceCategory,
      removeFinanceCategory,
      addSocialSnapshot,
      deleteSocialSnapshot,
      createSupplier,
      updateSupplier,
      deleteSupplier,
      createInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      changeMyPassword,
      resetDemo,
    };
  }, [data, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!value) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Cargando espacio de trabajo…</p>
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
