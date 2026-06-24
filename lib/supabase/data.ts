import type { SupabaseClient } from "@supabase/supabase-js";
import type { MosData } from "@/lib/types";

/**
 * Supabase data access for live mode. Maps the snake_case DB rows to the
 * camelCase domain model generically (every column maps 1:1 to a field), so a
 * single converter pair covers all tables.
 */

// store-key -> table name (financeCategories handled separately)
export const TABLE: Record<string, string> = {
  profiles: "profiles",
  projects: "projects",
  tasks: "tasks",
  comments: "task_comments",
  recurring: "recurring_tasks",
  meetings: "meetings",
  meetingActions: "meeting_actions",
  documents: "documents",
  kpis: "kpis",
  kpiUpdates: "kpi_updates",
  announcements: "announcements",
  activity: "activity_logs",
  notifications: "notifications",
  budgets: "budgets",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPersistable = (id: unknown) => typeof id === "string" && UUID_RE.test(id);

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function rowFrom(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in obj) if (obj[k] !== undefined) out[toSnake(k)] = obj[k];
  return out;
}

function objFrom(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out;
}

type Client = SupabaseClient;

/** Load the whole workspace. Members get only their own work; admins get all. */
export async function loadAll(
  sb: Client,
  userId: string,
  isAdmin: boolean,
): Promise<MosData> {
  const all = (t: string) => sb.from(t).select("*");
  const mine = (t: string, col: string) =>
    isAdmin ? all(t) : sb.from(t).select("*").eq(col, userId);

  const [
    profiles,
    projects,
    tasks,
    comments,
    recurring,
    meetings,
    meetingActions,
    documents,
    kpis,
    kpiUpdates,
    announcements,
    activity,
    notifications,
    budgets,
    financeCats,
  ] = await Promise.all([
    all("profiles"),
    all("projects"),
    mine("tasks", "assignee_id"),
    all("task_comments"),
    mine("recurring_tasks", "assignee_id"),
    all("meetings"),
    all("meeting_actions"),
    all("documents"),
    all("kpis"),
    all("kpi_updates"),
    all("announcements"),
    sb.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("notifications").select("*").eq("user_id", userId),
    all("budgets"),
    sb.from("finance_categories").select("name"),
  ]);

  const m = (res: { data: unknown }) =>
    ((res.data as Record<string, unknown>[]) ?? []).map(objFrom);

  return {
    profiles: m(profiles),
    projects: m(projects),
    tasks: m(tasks),
    comments: m(comments),
    recurring: m(recurring),
    meetings: m(meetings),
    meetingActions: m(meetingActions),
    documents: m(documents),
    kpis: m(kpis),
    kpiUpdates: m(kpiUpdates),
    announcements: m(announcements),
    activity: m(activity),
    notifications: m(notifications),
    budgets: m(budgets),
    financeCategories: ((financeCats.data as { name: string }[]) ?? []).map((r) => r.name),
  } as unknown as MosData;
}

/** Fire-and-forget upsert. Skips in-memory rows (non-uuid ids, e.g. recurring occurrences). */
export function saveRow(sb: Client, storeKey: string, row: Record<string, unknown>) {
  const table = TABLE[storeKey];
  if (!table || !isPersistable(row.id)) return;
  void sb
    .from(table)
    .upsert(rowFrom(row))
    .then(({ error }) => {
      if (error) console.warn(`[mos] save ${table} failed:`, error.message);
    });
}

export function deleteRow(sb: Client, storeKey: string, id: string) {
  const table = TABLE[storeKey];
  if (!table || !isPersistable(id)) return;
  void sb
    .from(table)
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn(`[mos] delete ${table} failed:`, error.message);
    });
}

export function addCategory(sb: Client, name: string) {
  void sb.from("finance_categories").upsert({ name }).then(({ error }) => {
    if (error) console.warn("[mos] add category failed:", error.message);
  });
}

export function removeCategory(sb: Client, name: string) {
  void sb.from("finance_categories").delete().eq("name", name).then(({ error }) => {
    if (error) console.warn("[mos] remove category failed:", error.message);
  });
}
