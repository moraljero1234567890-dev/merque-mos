"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useMos } from "@/lib/store";
import type { Kpi, KpiCategory } from "@/lib/types";
import { KPI_CATEGORY_META } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Modal,
  Progress,
  Ring,
  Textarea,
} from "@/components/ui";
import { AreaTrend, Sparkline } from "@/components/charts";
import { clamp, cn } from "@/lib/utils";

const CATEGORY_COLOR: Record<KpiCategory, string> = {
  marketing: "var(--info)",
  cx: "var(--success)",
  operations: "var(--warning)",
};

const CATEGORY_ORDER: KpiCategory[] = ["marketing", "cx", "operations"];

type Filter = "all" | KpiCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "marketing", label: KPI_CATEGORY_META.marketing.label },
  { key: "cx", label: KPI_CATEGORY_META.cx.label },
  { key: "operations", label: KPI_CATEGORY_META.operations.label },
];

/** Direction-aware progress: up = current/target, down = target/current. Clamped 0..100. */
function kpiProgress(kpi: Kpi) {
  const raw =
    kpi.direction === "up"
      ? (kpi.current / Math.max(kpi.target, 1e-9)) * 100
      : (kpi.target / Math.max(kpi.current, 1e-9)) * 100;
  return clamp(Math.round(raw));
}

function statusFor(progress: number): { tone: string; label: string } {
  if (progress >= 100) return { tone: "success", label: "On target" };
  if (progress >= 80) return { tone: "warning", label: "Close" };
  return { tone: "danger", label: "Behind" };
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function KpisPage() {
  const { data } = useMos();
  const [filter, setFilter] = useState<Filter>("all");
  const [detail, setDetail] = useState<string | null>(null);
  const [update, setUpdate] = useState<string | null>(null);

  const kpis = data.kpis;
  const filtered = useMemo(
    () => (filter === "all" ? kpis : kpis.filter((k) => k.category === filter)),
    [kpis, filter],
  );

  const summary = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => {
        const items = kpis.filter((k) => k.category === cat);
        const avg = items.length
          ? Math.round(items.reduce((s, k) => s + kpiProgress(k), 0) / items.length)
          : 0;
        return { cat, count: items.length, avg };
      }),
    [kpis],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="KPIs"
        description="Targets, current performance and trends across marketing, CX and operations."
      />

      {kpis.length === 0 ? (
        <EmptyKpis />
      ) : (
        <>
          {/* Summary rings — one per category */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.map(({ cat, count, avg }) => {
              const meta = KPI_CATEGORY_META[cat];
              return (
                <Card key={cat} className="flex items-center gap-4 p-4">
                  <Ring value={avg} size={56} stroke={5} color={CATEGORY_COLOR[cat]} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{avg}%</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {meta.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {count} {count === 1 ? "KPI" : "KPIs"}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Category filter */}
          <div className="mb-5 inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyKpis filtered />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  kpi={kpi}
                  onOpen={() => setDetail(kpi.id)}
                  onUpdate={() => setUpdate(kpi.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <KpiDetail kpiId={detail} onClose={() => setDetail(null)} />
      <UpdateModal kpiId={update} onClose={() => setUpdate(null)} />
    </div>
  );
}

function EmptyKpis({ filtered }: { filtered?: boolean }) {
  return (
    <div className="dotgrid flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
        <Target className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">
        {filtered ? "No KPIs in this category" : "No KPIs yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Try a different category to see tracked metrics."
          : "KPIs you track will show their targets, progress and trends here."}
      </p>
    </div>
  );
}

function useHistory(kpiId: string) {
  const { data } = useMos();
  return useMemo(
    () =>
      data.kpiUpdates
        .filter((u) => u.kpiId === kpiId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.kpiUpdates, kpiId],
  );
}

function KpiCard({
  kpi,
  onOpen,
  onUpdate,
}: {
  kpi: Kpi;
  onOpen: () => void;
  onUpdate: () => void;
}) {
  const { data } = useMos();
  const owner = data.profiles.find((p) => p.id === kpi.ownerId);
  const progress = kpiProgress(kpi);
  const status = statusFor(progress);
  const meta = KPI_CATEGORY_META[kpi.category];
  const history = useHistory(kpi.id).map((u) => ({ value: u.value }));
  const TrendIcon = kpi.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <Card className="group flex flex-col p-4 transition-all hover:border-border-strong hover:shadow-md">
      <button onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-snug">{kpi.name}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {owner && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar id={owner.id} name={owner.name} size={18} />
              {owner.name.split(" ")[0]}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end gap-1.5">
          <span className="text-2xl font-semibold tracking-tight">{fmt(kpi.current)}</span>
          <span className="text-sm text-muted-foreground">{kpi.unit}</span>
          <span className="ml-1 mb-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon className="h-3 w-3" />/ {fmt(kpi.target)}
            {kpi.unit}
          </span>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}%</span>
            <span>of target</span>
          </div>
          <Progress value={progress} />
        </div>

        {history.length > 1 && (
          <div className="mt-3 -mx-1">
            <Sparkline data={history} color={CATEGORY_COLOR[kpi.category]} height={36} />
          </div>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={onOpen}
          className="text-xs font-medium text-primary hover:underline"
        >
          Details
        </button>
        <Button variant="ghost" size="sm" onClick={onUpdate}>
          <Plus className="h-4 w-4" /> Update
        </Button>
      </div>
    </Card>
  );
}

function KpiDetail({ kpiId, onClose }: { kpiId: string | null; onClose: () => void }) {
  const { data } = useMos();
  const kpi = data.kpis.find((k) => k.id === kpiId);
  const history = useHistory(kpiId ?? "");

  if (!kpi) return null;

  const owner = data.profiles.find((p) => p.id === kpi.ownerId);
  const progress = kpiProgress(kpi);
  const status = statusFor(progress);
  const meta = KPI_CATEGORY_META[kpi.category];
  const trend = history.map((u) => ({ label: format(new Date(u.date), "MMM"), value: u.value }));

  const stats = [
    { label: "Current", value: `${fmt(kpi.current)}${kpi.unit}` },
    { label: "Target", value: `${fmt(kpi.target)}${kpi.unit}` },
    { label: "Progress", value: `${progress}%` },
    { label: "Owner", value: owner?.name.split(" ")[0] ?? "—" },
  ];

  return (
    <Modal open={!!kpiId} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{kpi.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpi.direction === "up" ? "Higher is better" : "Lower is better"} · last
            updated {format(new Date(kpi.updatedAt), "MMM d, yyyy")}
          </p>
        </div>

        <Card className="bg-surface/40 p-4">
          {trend.length > 1 ? (
            <AreaTrend data={trend} color={CATEGORY_COLOR[kpi.category]} height={220} unit={kpi.unit} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Not enough history to chart yet.
            </p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface/50 p-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-0.5 text-sm font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progress to target</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Log a new value</div>
          <UpdateForm kpi={kpi} />
        </div>
      </div>
    </Modal>
  );
}

function UpdateModal({ kpiId, onClose }: { kpiId: string | null; onClose: () => void }) {
  const { data } = useMos();
  const kpi = data.kpis.find((k) => k.id === kpiId);
  if (!kpi) return null;
  return (
    <Modal open={!!kpiId} onClose={onClose} title={`Update — ${kpi.name}`} size="sm">
      <UpdateForm kpi={kpi} onDone={onClose} />
    </Modal>
  );
}

function UpdateForm({ kpi, onDone }: { kpi: Kpi; onDone?: () => void }) {
  const { addKpiUpdate } = useMos();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return;
    addKpiUpdate(kpi.id, n, note.trim() || undefined);
    setValue("");
    setNote("");
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`New value (${kpi.unit})`}>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={String(kpi.current)}
            autoFocus
            className="h-9 w-full rounded-lg border border-border bg-input/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-ring focus:bg-card focus:outline-none"
          />
        </Field>
        <Field label="Current target">
          <div className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
            {fmt(kpi.target)}
            {kpi.unit}
          </div>
        </Field>
      </div>
      <Field label="Note (optional)">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What changed?"
          className="min-h-[60px]"
        />
      </Field>
      <div className="flex justify-end">
        <Button onClick={save} disabled={value.trim() === "" || Number.isNaN(Number(value))}>
          Save update
        </Button>
      </div>
    </div>
  );
}
