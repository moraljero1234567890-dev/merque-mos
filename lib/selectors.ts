import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import type { MosData, Profile, Project, Task } from "./types";

export function isOverdue(task: Task) {
  return (
    !!task.dueDate &&
    task.status !== "done" &&
    isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date()))
  );
}

export function openTasksFor(data: MosData, userId: string) {
  return data.tasks.filter((t) => t.assigneeId === userId && t.status !== "done");
}

export function plannedHours(data: MosData, userId: string) {
  return openTasksFor(data, userId).reduce((s, t) => s + t.estimatedHours, 0);
}

export function loggedHours(data: MosData, userId: string) {
  return data.tasks
    .filter((t) => t.assigneeId === userId)
    .reduce((s, t) => s + t.actualHours, 0);
}

export function capacityUtilization(data: MosData, profile: Profile) {
  if (!profile.weeklyCapacity) return 0;
  return Math.round((plannedHours(data, profile.id) / profile.weeklyCapacity) * 100);
}

export type Health = "on_track" | "at_risk" | "off_track";

export function projectHealth(project: Project, tasks: Task[]): Health {
  if (project.status === "completed") return "on_track";
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const overdue = projectTasks.filter(isOverdue).length;
  const start = startOfDay(new Date(project.startDate));
  const due = startOfDay(new Date(project.dueDate));
  const today = startOfDay(new Date());
  const totalDays = Math.max(1, differenceInCalendarDays(due, start));
  const elapsed = differenceInCalendarDays(today, start);
  const expectedProgress = Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
  const gap = expectedProgress - project.progress;

  if (project.status === "on_hold" || overdue >= 3 || gap > 30) return "off_track";
  if (overdue >= 1 || gap > 12) return "at_risk";
  return "on_track";
}

export const HEALTH_META: Record<Health, { label: string; tone: string; color: string }> = {
  on_track: { label: "On track", tone: "success", color: "var(--success)" },
  at_risk: { label: "At risk", tone: "warning", color: "var(--warning)" },
  off_track: { label: "Off track", tone: "danger", color: "var(--danger)" },
};

export function completionRate(data: MosData) {
  const real = data.tasks;
  if (!real.length) return 0;
  return Math.round((real.filter((t) => t.status === "done").length / real.length) * 100);
}

export function onTimeRate(data: MosData) {
  const done = data.tasks.filter((t) => t.status === "done" && t.dueDate && t.completedAt);
  if (!done.length) return 100;
  const onTime = done.filter(
    (t) => !isBefore(startOfDay(new Date(t.dueDate!)), startOfDay(new Date(t.completedAt!))),
  ).length;
  return Math.round((onTime / done.length) * 100);
}
