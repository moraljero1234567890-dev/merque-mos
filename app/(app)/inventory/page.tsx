"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useMos } from "@/lib/store";
import { INVENTORY_CATEGORIES } from "@/lib/types";
import type { InventoryItem } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { BarsByCategory } from "@/components/charts";
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

const LOW_STOCK = 5;

/* -------------------------------------------------------------------- Page */

export default function InventoryPage() {
  const { data } = useMos();
  const [itemModal, setItemModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [supplier, setSupplier] = useState("all");

  const supplierName = (id: string | null) =>
    id ? data.suppliers.find((s) => s.id === id)?.name ?? "—" : "—";

  // Distinct values present in the inventory for filters and datalists.
  const categories = useMemo(
    () => [...new Set(data.inventory.map((i) => i.category))].sort((a, b) => a.localeCompare(b)),
    [data.inventory],
  );
  const locations = useMemo(
    () =>
      [...new Set(data.inventory.map((i) => i.location).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [data.inventory],
  );

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data.inventory
      .filter((i) => {
        if (ql && !i.name.toLowerCase().includes(ql) && !(i.sku ?? "").toLowerCase().includes(ql))
          return false;
        if (category !== "all" && i.category !== category) return false;
        if (location !== "all" && i.location !== location) return false;
        if (supplier !== "all" && (i.supplierId ?? "") !== supplier) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.inventory, q, category, location, supplier]);

  const totalUnits = data.inventory.reduce((s, i) => s + i.quantity, 0);
  const totalValue = data.inventory.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const valueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of data.inventory) {
      map.set(i.category, (map.get(i.category) ?? 0) + i.quantity * i.unitCost);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.inventory]);

  const empty = data.inventory.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventario POP"
        description="Material promocional del equipo — existencias, ubicación, costo y proveedor."
        actions={
          <>
            <Button variant="outline" onClick={() => setSuppliersOpen(true)}>
              <Truck className="h-4 w-4" />
              Proveedores
            </Button>
            <Button onClick={() => setItemModal({ open: true })}>
              <Plus className="h-4 w-4" />
              Nuevo artículo
            </Button>
          </>
        }
      />

      {empty ? (
        <EmptyState
          icon={<Boxes className="h-5 w-5" />}
          title="Aún no hay material en el inventario"
          description="Lleva el control del material promocional del equipo (gorras, POP, impresos…): cuánto hay, dónde está, cuánto costó y de qué proveedor. Empieza por registrar tus proveedores y agrega el primer artículo."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSuppliersOpen(true)}>
                <Truck className="h-4 w-4" />
                Proveedores
              </Button>
              <Button onClick={() => setItemModal({ open: true })}>
                <Plus className="h-4 w-4" />
                Nuevo artículo
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Artículos" value={data.inventory.length} icon={Package} tone="primary" />
            <StatCard label="Unidades totales" value={totalUnits.toLocaleString()} icon={Boxes} tone="info" />
            <StatCard label="Valor del inventario" value={formatMoney(totalValue)} icon={Wallet} tone="success" />
            <StatCard label="Proveedores" value={data.suppliers.length} icon={Truck} tone="muted" />
          </div>

          {/* Valor por categoría */}
          {valueByCategory.length > 0 && (
            <Card>
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-sm font-semibold">Valor por categoría</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Valor total (cantidad × costo) del material por categoría.
                </p>
              </div>
              <div className="p-5">
                <BarsByCategory data={valueByCategory} height={240} />
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="lg:w-auto">
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select value={location} onChange={(e) => setLocation(e.target.value)} className="lg:w-auto">
                <option value="all">Todas</option>
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
              <Select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="lg:w-auto">
                <option value="all">Todos</option>
                {data.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Inventory table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Artículo</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Categoría</th>
                    <th className="px-4 py-2.5 font-medium">Cantidad</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Ubicación</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">Costo unit.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                    <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Proveedor</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Ningún artículo coincide con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    items.map((i) => {
                      const low = i.quantity <= LOW_STOCK;
                      return (
                        <tr
                          key={i.id}
                          onClick={() => setItemModal({ open: true, id: i.id })}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{i.name}</div>
                            {i.sku && (
                              <div className="text-xs text-muted-foreground">SKU {i.sku}</div>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <Badge tone="muted">{i.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 tabular-nums",
                                low && "text-danger",
                              )}
                            >
                              {low && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                              {i.quantity.toLocaleString()} {i.unit}
                            </span>
                            {low && (
                              <div className="text-[11px] font-medium text-danger">Bajo stock</div>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                            {i.location || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                            {formatMoney(i.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {formatMoney(i.quantity * i.unitCost)}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                            {supplierName(i.supplierId)}
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

      <ItemComposer
        open={itemModal.open}
        itemId={itemModal.id}
        locations={locations}
        onClose={() => setItemModal({ open: false })}
        onManageSuppliers={() => {
          setItemModal({ open: false });
          setSuppliersOpen(true);
        }}
      />
      <SuppliersModal open={suppliersOpen} onClose={() => setSuppliersOpen(false)} />
    </div>
  );
}

/* --------------------------------------------------------------- Item composer */

const NO_SUPPLIER = "__none__";

const emptyItem = {
  name: "",
  category: INVENTORY_CATEGORIES[0] as string,
  quantity: "0",
  unit: "unidades",
  location: "",
  unitCost: "0",
  supplierId: NO_SUPPLIER,
  sku: "",
  notes: "",
};

function ItemComposer({
  open,
  itemId,
  locations,
  onClose,
  onManageSuppliers,
}: {
  open: boolean;
  itemId?: string;
  locations: string[];
  onClose: () => void;
  onManageSuppliers: () => void;
}) {
  const { data, createInventoryItem, updateInventoryItem, deleteInventoryItem } = useMos();
  const editing = data.inventory.find((i) => i.id === itemId);
  const [form, setForm] = useState(emptyItem);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        quantity: String(editing.quantity),
        unit: editing.unit,
        location: editing.location,
        unitCost: String(editing.unitCost),
        supplierId: editing.supplierId ?? NO_SUPPLIER,
        sku: editing.sku ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      setForm(emptyItem);
    }
  }, [open, editing]);

  const set = (k: keyof typeof emptyItem, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    const payload: Partial<InventoryItem> & { name: string } = {
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      unit: form.unit.trim() || "unidades",
      location: form.location.trim(),
      unitCost: Number(form.unitCost) || 0,
      supplierId: form.supplierId === NO_SUPPLIER ? null : form.supplierId,
      sku: form.sku.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) updateInventoryItem(editing.id, payload);
    else createInventoryItem(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar artículo" : "Nuevo artículo"}
      description="Registra material promocional con su cantidad, ubicación, costo y proveedor."
      footer={
        <>
          {editing && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger/10"
              onClick={() => {
                deleteInventoryItem(editing.id);
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
          <Button onClick={save}>{editing ? "Guardar" : "Agregar"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="p. ej. Gorras Merquellantas"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ubicación">
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="p. ej. Bodega Bogotá"
              list="inventory-locations"
            />
            <datalist id="inventory-locations">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
          <Field label="Cantidad">
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Unidad">
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="unidades"
            />
          </Field>
          <Field label="Costo unitario (COP)">
            <Input
              type="number"
              min={0}
              step={500}
              value={form.unitCost}
              onChange={(e) => set("unitCost", e.target.value)}
              className="tabular-nums"
            />
          </Field>
          <Field label="SKU (opcional)">
            <Input
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="p. ej. GOR-001"
            />
          </Field>
        </div>

        <Field label="Proveedor">
          <Select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value={NO_SUPPLIER}>— Sin proveedor —</option>
            {data.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={onManageSuppliers}
            className="mt-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ¿No está en la lista? Agrega proveedores con el botón “Proveedores”.
          </button>
        </Field>

        <Field label="Nota">
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- Suppliers modal */

function SuppliersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, createSupplier, updateSupplier, deleteSupplier } = useMos();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setContact("");
    setCategory("");
    setEditId(null);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const startEdit = (id: string) => {
    const s = data.suppliers.find((x) => x.id === id);
    if (!s) return;
    setEditId(id);
    setName(s.name);
    setContact(s.contact ?? "");
    setCategory(s.category ?? "");
  };

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const patch = {
      name: n,
      contact: contact.trim() || undefined,
      category: category.trim() || undefined,
    };
    if (editId) updateSupplier(editId, patch);
    else createSupplier(patch);
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proveedores"
      description="Gestiona los proveedores del material promocional."
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Inline form */}
        <div className="rounded-lg border border-border bg-surface/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. Promocionales SAS"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>
            <Field label="Contacto">
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Persona / teléfono"
              />
            </Field>
            <Field label="Categoría">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Impresión, textil…"
              />
            </Field>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {editId && (
              <Button variant="ghost" onClick={reset}>
                Cancelar
              </Button>
            )}
            <Button onClick={submit}>
              {editId ? "Actualizar" : (
                <>
                  <Plus className="h-4 w-4" />
                  Agregar proveedor
                </>
              )}
            </Button>
          </div>
        </div>

        {data.suppliers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay proveedores. Agrega el primero arriba.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {data.suppliers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[s.contact, s.category].filter(Boolean).join(" · ") || "Sin detalles"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEdit(s.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Editar ${s.name}`}
                    title="Editar proveedor"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      deleteSupplier(s.id);
                      if (editId === s.id) reset();
                    }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Eliminar ${s.name}`}
                    title="Eliminar proveedor"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
