"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  Gauge as GaugeIcon,
  Lock,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { DEPARTMENTS } from "@/lib/types";
import type { Department } from "@/lib/types";
import { deptLabel } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Progress,
  Select,
} from "@/components/ui";
import { AreaTrend, BarsByCategory } from "@/components/charts";
import { cn, formatMoney } from "@/lib/utils";

/* --------------------------------------------------------------- Stat card */

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Wallet;
  tone?: string;
  hint?: string;
}) {
  const toneColor: Record<string, string> = {
    danger: "text-danger bg-danger/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneColor[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/* ----------------------------------------------------------------- Helpers */

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return format(new Date(Number(y), Number(mo) - 1, 1), "MMM yyyy", { locale: es });
}

/* -------------------------------------------------------------------- Page */

export default function FinancePage() {
  const { isAdmin, data } = useMos();
  const [composer, setComposer] = useState<{ open: boolean; id?: string }>({ open: false });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const currentMonth = format(new Date(), "yyyy-MM");
  const [scope, setScope] = useState("all");

  const months = useMemo(() => {
    const set = new Set(data.budgets.map((b) => b.month));
    set.add(currentMonth);
    return [...set].sort().reverse();
  }, [data.budgets, currentMonth]);

  const lines = useMemo(
    () => (scope === "all" ? data.budgets : data.budgets.filter((b) => b.month === scope)),
    [data.budgets, scope],
  );

  const planned = lines.reduce((s, b) => s + b.planned, 0);
  const actual = lines.reduce((s, b) => s + b.actual, 0);
  const available = planned - actual;
  const used = planned ? Math.round((actual / planned) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, { planned: number; actual: number }>();
    for (const b of lines) {
      const cur = map.get(b.category) ?? { planned: 0, actual: 0 };
      cur.planned += b.planned;
      cur.actual += b.actual;
      map.set(b.category, cur);
    }
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.planned - a.planned);
  }, [lines]);

  const catBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of lines) map.set(b.category, (map.get(b.category) ?? 0) + b.actual);
    return [...map.entries()]
      .map(([name, value]) => ({ name, value, color: "var(--primary)" }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [lines]);

  const historic = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of data.budgets) map.set(b.month, (map.get(b.month) ?? 0) + b.actual);
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, value]) => {
        const [y, mo] = m.split("-");
        return { label: format(new Date(Number(y), Number(mo) - 1, 1), "MMM yy", { locale: es }), value };
      });
  }, [data.budgets]);

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Finanzas"
          description="Controla la inversión de marketing por categoría, mes a mes."
        />
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title="Solo administradores"
          description="El portal de finanzas está restringido a administradores. Cambia a un usuario administrador desde el menú del avatar en la esquina superior derecha para gestionar el presupuesto."
        />
      </div>
    );
  }

  const empty = data.budgets.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Finanzas"
        description="Controla la inversión de marketing por categoría, mes a mes."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              Gestionar categorías
            </Button>
            <Button onClick={() => setComposer({ open: true })}>
              <Plus className="h-4 w-4" />
              Agregar gasto
            </Button>
          </>
        }
      />

      {empty ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Aún no hay gastos registrados"
          description="Registra los gastos de marketing (medios, producción, eventos…) con su monto planeado y ejecutado para controlar la inversión del área mes a mes."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                Gestionar categorías
              </Button>
              <Button onClick={() => setComposer({ open: true })}>
                <Plus className="h-4 w-4" />
                Agregar gasto
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Month selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
              <option value="all">Histórico (todos los meses)</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
            <span className="text-xs text-muted-foreground">
              {lines.length} {lines.length === 1 ? "gasto" : "gastos"} en el alcance seleccionado
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Planeado" value={formatMoney(planned)} icon={Wallet} tone="primary" />
            <StatCard label="Ejecutado" value={formatMoney(actual)} icon={CheckCircle2} tone="info" />
            <StatCard
              label="Disponible"
              value={formatMoney(available)}
              icon={Timer}
              tone={available < 0 ? "danger" : "success"}
              hint={available < 0 ? "Sobre presupuesto" : "Planeado − ejecutado"}
            />
            <StatCard
              label="% de ejecución"
              value={`${used}%`}
              icon={GaugeIcon}
              tone={used > 100 ? "danger" : used > 85 ? "warning" : "success"}
            />
          </div>

          {/* Planeado vs ejecutado + Ejecución por categoría */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-sm font-semibold">Planeado vs. ejecutado por categoría</h2>
              </div>
              <div className="space-y-4 p-5">
                {byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin gastos en este alcance.</p>
                ) : (
                  byCategory.map((c) => {
                    const ratio = c.planned
                      ? Math.min(100, Math.round((c.actual / c.planned) * 100))
                      : 0;
                    const over = c.actual > c.planned;
                    return (
                      <div key={c.category}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{c.category}</span>
                          <span
                            className={cn(
                              "tabular-nums text-muted-foreground",
                              over && "text-danger",
                            )}
                          >
                            {formatMoney(c.actual)} / {formatMoney(c.planned)}
                          </span>
                        </div>
                        <Progress value={ratio} className={over ? "[&>div]:bg-danger" : undefined} />
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="lg:col-span-1">
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-sm font-semibold">Ejecución por categoría</h2>
              </div>
              <div className="p-5">
                {catBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin ejecución registrada.</p>
                ) : (
                  <BarsByCategory data={catBars} height={240} />
                )}
              </div>
            </Card>
          </div>

          {/* Histórico */}
          <Card>
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">Histórico de ejecución</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Total ejecutado por mes en todos los gastos registrados.
              </p>
            </div>
            <div className="p-5">
              {historic.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay ejecución histórica.</p>
              ) : (
                <AreaTrend data={historic} height={240} />
              )}
            </div>
          </Card>

          {/* Tabla de gastos */}
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">
                Tabla de gastos
                <span className="ml-2 font-normal text-muted-foreground">
                  {scope === "all" ? "· Histórico" : `· ${monthLabel(scope)}`}
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Concepto</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Categoría</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Área</th>
                    <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Mes</th>
                    <th className="px-4 py-2.5 text-right font-medium">Planeado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ejecutado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Variación</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No hay gastos en este alcance.
                      </td>
                    </tr>
                  ) : (
                    lines.map((b) => {
                      const variance = b.planned - b.actual;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setComposer({ open: true, id: b.id })}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3 font-medium">{b.concept}</td>
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {b.category}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <Badge tone="muted">{deptLabel(b.department)}</Badge>
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                            {monthLabel(b.month)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatMoney(b.planned)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatMoney(b.actual)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-medium tabular-nums",
                              variance < 0 ? "text-danger" : "text-success",
                            )}
                          >
                            {formatMoney(variance)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <Pencil className="inline h-3.5 w-3.5 text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <BudgetComposer
        open={composer.open}
        lineId={composer.id}
        defaultMonth={scope !== "all" ? scope : currentMonth}
        onClose={() => setComposer({ open: false })}
      />
      <CategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------- Composer */

const emptyBudget = {
  concept: "",
  department: DEPARTMENTS[0] as Department,
  category: "",
  month: "",
  planned: "0",
  actual: "0",
  note: "",
};

function BudgetComposer({
  open,
  lineId,
  defaultMonth,
  onClose,
}: {
  open: boolean;
  lineId?: string;
  defaultMonth: string;
  onClose: () => void;
}) {
  const { data, createBudget, updateBudget, deleteBudget } = useMos();
  const editing = data.budgets.find((b) => b.id === lineId);
  const categories = data.financeCategories;
  const [form, setForm] = useState(emptyBudget);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        concept: editing.concept,
        department: editing.department,
        category: editing.category,
        month: editing.month,
        planned: String(editing.planned),
        actual: String(editing.actual),
        note: editing.note ?? "",
      });
    } else {
      setForm({
        ...emptyBudget,
        month: defaultMonth,
        category: categories[0] ?? "",
      });
    }
  }, [open, editing, defaultMonth, categories]);

  const set = (k: keyof typeof emptyBudget, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.concept.trim()) return;
    const payload = {
      concept: form.concept.trim(),
      department: form.department,
      category: form.category,
      month: form.month || format(new Date(), "yyyy-MM"),
      planned: Number(form.planned) || 0,
      actual: Number(form.actual) || 0,
      note: form.note,
    };
    if (editing) updateBudget(editing.id, payload);
    else createBudget(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar gasto" : "Agregar gasto"}
      footer={
        <>
          {editing && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger/10"
              onClick={() => {
                deleteBudget(editing.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{editing ? "Guardar" : "Crear"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Concepto">
          <Input
            value={form.concept}
            onChange={(e) => set("concept", e.target.value)}
            placeholder="p. ej. Pauta Meta — Promo llantas"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categories.length === 0 && <option value="">Sin categorías</option>}
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Área">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {deptLabel(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mes">
            <Input type="month" value={form.month} onChange={(e) => set("month", e.target.value)} />
          </Field>
          <div />
          <Field label="Planeado (COP)">
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.planned}
              onChange={(e) => set("planned", e.target.value)}
            />
          </Field>
          <Field label="Ejecutado (COP)">
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.actual}
              onChange={(e) => set("actual", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Nota">
          <Input
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------- Categories modal */

function CategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addFinanceCategory, removeFinanceCategory } = useMos();
  const [name, setName] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    addFinanceCategory(n);
    setName("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar categorías"
      description="Crea y organiza las categorías de gasto de marketing."
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Nueva categoría">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="p. ej. Medios pagados"
              />
            </Field>
          </div>
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {data.financeCategories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay categorías. Agrega la primera arriba.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {data.financeCategories.map((c) => (
              <li key={c} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="font-medium">{c}</span>
                <button
                  onClick={() => removeFinanceCategory(c)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label={`Eliminar ${c}`}
                  title="Eliminar categoría"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
