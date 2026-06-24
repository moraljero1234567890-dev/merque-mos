-- ===========================================================================
-- Inventario POP — material promocional (gorras, POP, impresos…) con ubicación,
-- costo y proveedor. Compartido: todo el equipo lee y gestiona. Run once.
-- ===========================================================================
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact     text,
  category    text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists inventory_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'Otros',
  quantity    numeric not null default 0,
  unit        text not null default 'unidades',
  location    text not null default '',
  unit_cost   numeric not null default 0,
  supplier_id uuid references suppliers (id) on delete set null,
  sku         text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists inventory_supplier_idx on inventory_items (supplier_id);

alter table suppliers       enable row level security;
alter table inventory_items enable row level security;

-- The whole team can read and manage inventory & suppliers.
create policy "team read suppliers"   on suppliers for select using (auth.role() = 'authenticated');
create policy "team write suppliers"  on suppliers for insert with check (auth.role() = 'authenticated');
create policy "team update suppliers" on suppliers for update using (auth.role() = 'authenticated');
create policy "team delete suppliers" on suppliers for delete using (auth.role() = 'authenticated');

create policy "team read inventory"   on inventory_items for select using (auth.role() = 'authenticated');
create policy "team write inventory"  on inventory_items for insert with check (auth.role() = 'authenticated');
create policy "team update inventory" on inventory_items for update using (auth.role() = 'authenticated');
create policy "team delete inventory" on inventory_items for delete using (auth.role() = 'authenticated');
