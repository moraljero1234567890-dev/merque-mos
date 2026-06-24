import {
  addDays,
  addMonths,
  addWeeks,
  addQuarters,
  addYears,
  formatISO,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import type { Frequency, RecurringTask, Task } from "./types";

const dayIso = (d: Date) => formatISO(startOfDay(d), { representation: "date" });

function step(date: Date, freq: Frequency): Date {
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

/**
 * Materialize occurrence dates for a recurring task between [from, to].
 */
export function occurrencesBetween(r: RecurringTask, from: Date, to: Date): string[] {
  const out: string[] = [];
  let cursor = startOfDay(new Date(r.anchorDate));
  // Fast-forward to the window without an unbounded loop.
  let guard = 0;
  while (isBefore(cursor, from) && guard < 5000) {
    cursor = step(cursor, r.frequency);
    guard++;
  }
  while (!isAfter(cursor, to) && guard < 5000) {
    out.push(dayIso(cursor));
    cursor = step(cursor, r.frequency);
    guard++;
  }
  return out;
}

/**
 * Generate occurrence tasks for all active recurring definitions, covering the
 * last `pastDays` and the next `futureDays`. Skips dates already materialized
 * (matched by the deterministic occurrence id).
 */
export function generateOccurrences(
  recurring: RecurringTask[],
  existing: Task[],
  opts: { pastDays?: number; futureDays?: number } = {},
): Task[] {
  const { pastDays = 45, futureDays = 21 } = opts;
  const now = new Date();
  const from = startOfDay(addDays(now, -pastDays));
  const to = startOfDay(addDays(now, futureDays));
  const today = startOfDay(now);
  const have = new Set(existing.map((x) => x.id));
  const created: Task[] = [];

  for (const r of recurring) {
    if (!r.active) continue;
    for (const date of occurrencesBetween(r, from, to)) {
      const id = `occ_${r.id}_${date}`;
      if (have.has(id)) continue;
      const due = new Date(date);
      const isPast = isBefore(due, today);
      created.push({
        id,
        title: r.title,
        description: r.description,
        assigneeId: r.assigneeId,
        projectId: null,
        status: isPast ? "done" : "todo",
        priority: r.priority,
        dueDate: date,
        estimatedHours: r.estimatedHours,
        actualHours: isPast ? r.estimatedHours : 0,
        attachments: [],
        recurringId: r.id,
        createdAt: formatISO(due),
        completedAt: isPast ? formatISO(due) : null,
      });
    }
  }
  return created;
}
