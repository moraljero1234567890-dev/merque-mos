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
import { AreaTrend } from "@/components/charts";
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
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const currentMonth = format(new Date(), "yyyy-MM");
  const [scope, setScope] = useState(currentMonth);

  const months = useMemo(() => {
    const set = new Set(data.budgets.map((b) => b.month));
    set.add(currentMonth);
    return [...set].sort().reverse();
  }, [data.budgets, currentMonth]);

  // Expense rows in the selected scope (kind === "expense").
  const expenses = useMemo(
    () =>
      data.budgets.filter(
        (b) => b.kind === "expense" && (scope === "all" || b.month === scope),
      ),
    [data.budgets, scope],
  );

  // Aggregation for the selected month: planned (budget) and spent (expense) by category.
  const byCategory = useMemo(() => {
    const map = new Map<string, { planned: number; spent: number }>();
    const lines =
      scope === "all" ? data.budgets : data.budgets.filter((b) => b.month === scope);
    for (const b of lines) {
      const cur = map.get(b.category) ?? { planned: 0, spent: 0 };
      if (b.kind === "budget") cur.planned += b.planned;
      else cur.spent += b.actual;
      map.set(b.category, cur);
    }
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .filter((c) => c.planned > 0 || c.spent > 0)
      .sort((a, b) => b.planned - a.planned);
  }, [data.budgets, scope]);

  const planned = byCategory.reduce((s, c) => s + c.planned, 0);
  const spent = byCategory.reduce((s, c) => s + c.spent, 0);
  const available = planned - spent;
  const used = planned ? Math.round((spent / planned) * 100) : 0;

  const historic = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of data.budgets) {
      if (b.kind !== "expense") continue;
      map.set(b.month, (map.get(b.month) ?? 0) + b.actual);
    }
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
          description="Define el presupuesto del mes y controla la ejecución por categoría."
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
        description="Define el presupuesto del mes y controla la ejecución por categoría."
        actions={
          <>
            <Button variant="ghost" onClick={() => setCategoriesOpen(true)}>
              Gestionar categorías
            </Button>
            <Button variant="outline" onClick={() => setBudgetModalOpen(true)}>
              Definir presupuesto del mes
            </Button>
            <Button onClick={() => setExpenseModal({ open: true })}>
              <Plus className="h-4 w-4" />
              Registrar gasto
            </Button>
          </>
        }
      />

      {empty ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Aún no hay presupuesto definido"
          description="Empieza por definir el presupuesto del mes por categoría y luego registra los gastos de marketing (medios, producción, eventos…) para controlar la ejecución contra lo planeado."
          action={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCategoriesOpen(true)}>
                Gestionar categorías
              </Button>
              <Button onClick={() => setBudgetModalOpen(true)}>
                Definir presupuesto del mes
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Month selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
              <option value="all">Histórico (todos)</option>
            </Select>
            <span className="text-xs text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"} en el alcance seleccionado
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Presupuesto" value={formatMoney(planned)} icon={Wallet} tone="primary" />
            <StatCard label="Ejecutado" value={formatMoney(spent)} icon={CheckCircle2} tone="info" />
            <StatCard
              label="Disponible"
              value={formatMoney(available)}
              icon={Timer}
              tone={available < 0 ? "danger" : "success"}
              hint={available < 0 ? "Sobre presupuesto" : "Presupuesto − ejecutado"}
            />
            <StatCard
              label="% de ejecución"
              value={`${used}%`}
              icon={GaugeIcon}
              tone={used > 100 ? "danger" : used > 85 ? "warning" : "success"}
            />
          </div>

          {/* Presupuesto vs. ejecución por categoría */}
          <Card>
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold">
                Presupuesto vs. ejecución por categoría
                <span className="ml-2 font-normal text-muted-foreground">
                  {scope === "all" ? "· Histórico" : `· ${monthLabel(scope)}`}
                </span>
              </h2>
            </div>
            <div className="space-y-4 p-5">
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay presupuesto ni ejecución en este alcance.
                </p>
              ) : (
                byCategory.map((c) => {
                  const ratio = c.planned
                    ? Math.min(100, Math.round((c.spent / c.planned) * 100))
                    : 100;
                  const over = c.spent > c.planned;
                  return (
                    <div key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span
                          className={cn("tabular-nums text-muted-foreground", over && "text-danger")}
                        >
                          {formatMoney(c.spent)} / {formatMoney(c.planned)}
                        </span>
                      </div>
                      <Progress value={ratio} className={over ? "[&>div]:bg-danger" : undefined} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

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
                Gastos
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
                    <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Aún no hay gastos en este alcance.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setExpenseModal({ open: true, id: b.id })}
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
                        <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.actual)}</td>
                        <td className="px-2 py-3 text-right">
                          <Pencil className="inline h-3.5 w-3.5 text-muted-foreground" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <BudgetModal
        open={budgetModalOpen}
        defaultMonth={scope !== "all" ? scope : currentMonth}
        onClose={() => setBudgetModalOpen(false)}
      />
      <ExpenseComposer
        open={expenseModal.open}
        lineId={expenseModal.id}
        defaultMonth={scope !== "all" ? scope : currentMonth}
        onClose={() => setExpenseModal({ open: false })}
      />
      <CategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------- Definir presupuesto */

function BudgetModal({
  open,
  defaultMonth,
  onClose,
}: {
  open: boolean;
  defaultMonth: string;
  onClose: () => void;
}) {
  const { data, createBudget, updateBudget } = useMos();
  const categories = data.financeCategories;
  const [month, setMonth] = useState(defaultMonth);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // Existing budget line for a (category, month) pair.
  const budgetLine = (category: string, m: string) =>
    data.budgets.find(
      (b) => b.kind === "budget" && b.category === category && b.month === m,
    );

  useEffect(() => {
    if (!open) return;
    const m = defaultMonth || format(new Date(), "yyyy-MM");
    setMonth(m);
    const next: Record<string, string> = {};
    for (const c of categories) {
      const line = budgetLine(c, m);
      next[c] = line ? String(line.planned) : "0";
    }
    setAmounts(next);
  }, [open, defaultMonth, categories]);

  // Re-prefill amounts when the chosen month changes.
  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const c of categories) {
      const line = budgetLine(c, month);
      next[c] = line ? String(line.planned) : "0";
    }
    setAmounts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const set = (category: string, v: string) =>
    setAmounts((a) => ({ ...a, [category]: v }));

  const save = () => {
    const m = month || format(new Date(), "yyyy-MM");
    for (const c of categories) {
      const planned = Number(amounts[c]) || 0;
      const line = budgetLine(c, m);
      if (line) {
        updateBudget(line.id, { planned });
      } else if (planned > 0) {
        createBudget({
          kind: "budget",
          concept: c,
          category: c,
          month: m,
          planned,
          actual: 0,
        });
      }
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Definir presupuesto del mes"
      description="Asigna el monto planeado por categoría para el mes seleccionado."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={categories.length === 0}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mes">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>

        {categories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay categorías. Crea categorías desde “Gestionar categorías” para asignar
            presupuesto.
          </p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="text-sm font-medium">{c}</span>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={amounts[c] ?? "0"}
                  onChange={(e) => set(c, e.target.value)}
                  className="w-40 text-right tabular-nums"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- Registrar gasto */

const emptyExpense = {
  concept: "",
  department: DEPARTMENTS[0] as Department,
  category: "",
  month: "",
  actual: "0",
  note: "",
};

function ExpenseComposer({
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
  const [form, setForm] = useState(emptyExpense);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        concept: editing.concept,
        department: editing.department,
        category: editing.category,
        month: editing.month,
        actual: String(editing.actual),
        note: editing.note ?? "",
      });
    } else {
      setForm({
        ...emptyExpense,
        month: defaultMonth,
        category: categories[0] ?? "",
      });
    }
  }, [open, editing, defaultMonth, categories]);

  const set = (k: keyof typeof emptyExpense, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.concept.trim()) return;
    const payload = {
      kind: "expense" as const,
      concept: form.concept.trim(),
      department: form.department,
      category: form.category,
      month: form.month || format(new Date(), "yyyy-MM"),
      planned: 0,
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
      title={editing ? "Editar gasto" : "Registrar gasto"}
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
          <Button onClick={save}>{editing ? "Guardar" : "Registrar"}</Button>
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
          <Field label="Monto (COP)">
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
