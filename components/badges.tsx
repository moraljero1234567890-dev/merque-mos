import { Badge, Dot } from "./ui";
import {
  PRIORITY_META,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
} from "@/lib/labels";
import type { Priority, ProjectStatus, TaskStatus } from "@/lib/types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = TASK_STATUS_META[status];
  return (
    <Badge tone="muted" className="bg-transparent">
      <Dot color={m.dot} />
      {m.label}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const m = PROJECT_STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
