// ---------------------------------------------------------------------------
// MOS domain model. Mirrors the Supabase schema in /supabase/migrations.
// ---------------------------------------------------------------------------

export type Role = "admin" | "member";

export type Department =
  | "Brand"
  | "Content"
  | "Performance"
  | "CRM"
  | "Retail Marketing"
  | "Analytics";

export const DEPARTMENTS: Department[] = [
  "Brand",
  "Content",
  "Performance",
  "CRM",
  "Retail Marketing",
  "Analytics",
];

export type Priority = "low" | "medium" | "high" | "urgent";
export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";
export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];

export type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting" | "done";
export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "waiting",
  "done",
];

export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly";
export const FREQUENCIES: Frequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
];

export type KpiCategory = "marketing" | "cx" | "operations";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  department: Department;
  avatarColor?: string;
  weeklyCapacity: number; // hours available per week
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
  department: Department;
  progress: number; // 0–100
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  kind: string;
  size: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string | null;
  projectId: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  estimatedHours: number;
  actualHours: number;
  notes?: string;
  attachments: Attachment[];
  recurringId?: string | null;
  meetingId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface RecurringTask {
  id: string;
  title: string;
  description: string;
  frequency: Frequency;
  assigneeId: string | null;
  estimatedHours: number;
  priority: Priority;
  department: Department;
  anchorDate: string; // first occurrence date
  active: boolean;
  lastGeneratedDate?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendeeIds: string[];
  agenda: string;
  notes: string;
  decisions: string[];
  createdAt: string;
}

export interface MeetingAction {
  id: string;
  meetingId: string;
  description: string;
  assigneeId: string | null;
  dueDate: string | null;
  taskId?: string | null; // task created from this action
}

export interface Document {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  fileKind?: "doc" | "sheet" | "pdf" | "image" | "slide" | "link";
  ownerId: string;
  url?: string;
  size?: number;
  updatedAt: string;
}

export interface Kpi {
  id: string;
  name: string;
  category: KpiCategory;
  ownerId: string;
  target: number;
  current: number;
  unit: string;
  direction: "up" | "down"; // is higher better?
  updatedAt: string;
}

export interface KpiUpdate {
  id: string;
  kpiId: string;
  value: number;
  date: string;
  note?: string;
}

export interface Announcement {
  id: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface MosData {
  profiles: Profile[];
  projects: Project[];
  tasks: Task[];
  comments: TaskComment[];
  recurring: RecurringTask[];
  meetings: Meeting[];
  meetingActions: MeetingAction[];
  documents: Document[];
  kpis: Kpi[];
  kpiUpdates: KpiUpdate[];
  announcements: Announcement[];
  activity: ActivityLog[];
  notifications: Notification[];
}
