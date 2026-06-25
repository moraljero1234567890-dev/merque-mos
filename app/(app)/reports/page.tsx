"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Target,
  Users,
} from "lucide-react";
import { useMos } from "@/lib/store";
import {
  completionRate,
  onTimeRate,
  openTasksFor,
  projectHealth,
  HEALTH_META,
} from "@/lib/selectors";
import { KPI_CATEGORY_META, PRIORITY_META, PROJECT_STATUS_META, deptLabel } from "@/lib/labels";
import type { MosData } from "@/lib/types";
import {
  exportCsv,
  exportExcel,
  exportPdf,
  htmlTable,
  statGrid,
  type Cell,
} from "@/lib/export";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Button, Card } from "@/components/ui";
import { Gauge } from "@/components/charts";
import { cn } from "@/lib/utils";

type ReportTable = { headers: string[]; rows: Cell[][] };

const FILE_PREFIX = "merqueo-";

function nameOf(data: MosData, id: string | undefined | null) {
  return data.profiles.find((p) => p.id === id)?.name ?? "Sin asignar";
}

// ── Report builders ────────────────────────────────────────────────────────

function teamPerformanceReport(data: MosData): ReportTable {
  const headers = [
    "Nombre",
    "Cargo",
    "Departamento",
    "Tareas abiertas",
    "Completadas",
  ];
  const rows: Cell[][] = data.profiles.map((p) => {
    const completed = data.tasks.filter(
      (t) => t.assigneeId === p.id && t.status === "done",
    ).length;
    return [
      p.name,
      p.title,
      deptLabel(p.department),
      openTasksFor(data, p.id).length,
      completed,
    ];
  });
  return { headers, rows };
}

function projectStatusReport(data: MosData): ReportTable {
  const headers = [
    "Proyecto",
    "Responsable",
    "Estado",
    "Prioridad",
    "Departamento",
    "Progreso %",
    "Tareas",
    "Salud",
    "Fecha límite",
  ];
  const rows: Cell[][] = data.projects.map((p) => {
    const taskCount = data.tasks.filter((t) => t.projectId === p.id).length;
    const health = HEALTH_META[projectHealth(p, data.tasks)].label;
    return [
      p.name,
      nameOf(data, p.ownerId),
      PROJECT_STATUS_META[p.status].label,
      PRIORITY_META[p.priority].label,
      deptLabel(p.department),
      p.progress,
      taskCount,
      health,
      p.dueDate ? format(new Date(p.dueDate), "d 'de' MMM, yyyy", { locale: es }) : "—",
    ];
  });
  return { headers, rows };
}

function kpiProgress(current: number, target: number, direction: "up" | "down") {
  return direction === "up"
    ? Math.round((current / Math.max(target, 0.001)) * 100)
    : Math.round((target / Math.max(current, 0.001)) * 100);
}

function kpiReport(data: MosData): ReportTable {
  const headers = [
    "KPI",
    "Categoría",
    "Responsable",
    "Actual",
    "Meta",
    "Unidad",
    "Progreso %",
    "Estado",
  ];
  const rows: Cell[][] = data.kpis.map((k) => {
    const prog = kpiProgress(k.current, k.target, k.direction);
    const status = prog >= 100 ? "En meta" : prog >= 75 ? "En camino" : "Atrasado";
    return [
      k.name,
      KPI_CATEGORY_META[k.category].label,
      nameOf(data, k.ownerId),
      k.current.toLocaleString(),
      k.target.toLocaleString(),
      k.unit,
      prog,
      status,
    ];
  });
  return { headers, rows };
}

// ── Summary stats for PDF stat grids ───────────────────────────────────────

function avgKpiAttainment(data: MosData) {
  if (!data.kpis.length) return 0;
  const total = data.kpis.reduce(
    (s, k) => s + Math.min(100, kpiProgress(k.current, k.target, k.direction)),
    0,
  );
  return Math.round(total / data.kpis.length);
}

// ── UI building blocks ─────────────────────────────────────────────────────

function PreviewTable({ table }: { table: ReportTable }) {
  const preview = table.rows.slice(0, 4);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground">
            {table.headers.slice(0, 4).map((h) => (
              <th key={h} className="px-2.5 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {preview.length ? (
            preview.map((row, i) => (
              <tr key={i}>
                {row.slice(0, 4).map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "truncate px-2.5 py-1.5",
                      j === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {cell ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="px-2.5 py-4 text-center text-muted-foreground"
              >
                No hay datos disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  title,
  description,
  table,
  filename,
  pdfTitle,
  stats,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  table: ReportTable;
  filename: string;
  pdfTitle: string;
  stats: { k: string; v: Cell }[];
}) {
  const file = `${FILE_PREFIX}${filename}`;

  const onCsv = () => exportCsv(file, table.headers, table.rows);
  const onExcel = () => exportExcel(file, table.headers, table.rows, title);
  const onPdf = () =>
    exportPdf(
      pdfTitle,
      `<h1>${pdfTitle}</h1><p class="muted">Generado ${format(
        new Date(),
        "d 'de' MMMM 'de' yyyy",
        { locale: es },
      )}</p>${statGrid(stats)}<h2>Detalle</h2>${htmlTable(
        table.headers,
        table.rows,
      )}`,
    );

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {table.rows.length} filas
        </span>
      </div>

      <div className="mt-4 flex-1">
        <PreviewTable table={table} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCsv}>
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onPdf}>
          <FileText className="h-3.5 w-3.5" />
          PDF
        </Button>
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data } = useMos();

  const team = useMemo(() => teamPerformanceReport(data), [data]);
  const projects = useMemo(() => projectStatusReport(data), [data]);
  const kpis = useMemo(() => kpiReport(data), [data]);

  const cRate = completionRate(data);
  const otRate = onTimeRate(data);
  const activeProjects = data.projects.filter((p) => p.status === "active").length;
  const kpiAttainment = avgKpiAttainment(data);

  const baseStats: { k: string; v: Cell }[] = [
    { k: "Tamaño del equipo", v: data.profiles.length },
    { k: "Tasa de finalización", v: `${cRate}%` },
    { k: "Tasa a tiempo", v: `${otRate}%` },
    { k: "Proyectos activos", v: activeProjects },
  ];

  const exportFullScorecard = () => {
    exportPdf(
      "Scorecard del departamento",
      `<h1>Scorecard del departamento</h1>` +
        `<p class="muted">Merquellantas MOS · Generado ${format(
          new Date(),
          "d 'de' MMMM 'de' yyyy",
          { locale: es },
        )}</p>` +
        statGrid([
          { k: "Tasa de finalización", v: `${cRate}%` },
          { k: "Tasa a tiempo", v: `${otRate}%` },
          { k: "Proyectos activos", v: activeProjects },
          { k: "Cumplimiento promedio de KPIs", v: `${kpiAttainment}%` },
        ]) +
        `<h2>Desempeño del equipo</h2>${htmlTable(team.headers, team.rows)}` +
        `<h2>Estado de proyectos</h2>${htmlTable(projects.headers, projects.rows)}` +
        `<h2>Reporte de KPIs</h2>${htmlTable(kpis.headers, kpis.rows)}`,
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reportes"
        description="Genera y exporta reportes de equipo, proyectos y KPIs."
        actions={
          <Button onClick={exportFullScorecard}>
            <Download className="h-4 w-4" />
            Exportar scorecard completo
          </Button>
        }
      />

      {/* Department scorecard summary */}
      <SectionTitle>Scorecard del departamento</SectionTitle>
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col items-center">
            <Gauge value={cRate} height={120} label="completion" />
          </div>
          <div className="flex flex-col items-center">
            <Gauge value={otRate} height={120} label="on-time" color="var(--success)" />
          </div>
          <div className="flex flex-col justify-center gap-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              Proyectos activos
            </div>
            <div className="text-3xl font-semibold tracking-tight">
              {activeProjects}
            </div>
            <div className="text-xs text-muted-foreground">
              de {data.projects.length} en total
            </div>
          </div>
          <div className="flex flex-col justify-center gap-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Cumplimiento promedio de KPIs
            </div>
            <div className="text-3xl font-semibold tracking-tight">
              {kpiAttainment}%
            </div>
            <div className="text-xs text-muted-foreground">
              en {data.kpis.length} KPIs
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <Button variant="secondary" size="sm" onClick={exportFullScorecard}>
            <FileText className="h-3.5 w-3.5" />
            Exportar scorecard completo (PDF)
          </Button>
        </div>
      </Card>

      {/* Report cards */}
      <div className="mt-6">
        <SectionTitle>Reportes</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReportCard
            icon={Users}
            title="Desempeño del equipo"
            description="Tareas abiertas y completadas por cada miembro."
            table={team}
            filename="team-performance"
            pdfTitle="Reporte de desempeño del equipo"
            stats={baseStats}
          />
          <ReportCard
            icon={FolderKanban}
            title="Estado de proyectos"
            description="Estado, progreso y salud de todos los proyectos."
            table={projects}
            filename="project-status"
            pdfTitle="Reporte de estado de proyectos"
            stats={[
              { k: "Proyectos", v: data.projects.length },
              { k: "Proyectos activos", v: activeProjects },
              { k: "Tasa de finalización", v: `${cRate}%` },
              { k: "Tasa a tiempo", v: `${otRate}%` },
            ]}
          />
          <ReportCard
            icon={Target}
            title="Reporte de KPIs"
            description="Cumplimiento frente a la meta de cada KPI monitoreado."
            table={kpis}
            filename="kpi-report"
            pdfTitle="Reporte de KPIs"
            stats={[
              { k: "KPIs monitoreados", v: data.kpis.length },
              { k: "Cumplimiento promedio", v: `${kpiAttainment}%` },
              { k: "Tasa de finalización", v: `${cRate}%` },
              { k: "Tasa a tiempo", v: `${otRate}%` },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
