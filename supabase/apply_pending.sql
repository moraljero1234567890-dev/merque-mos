-- ===========================================================================
-- Merquellantas MOS — pending migrations, all in one. Paste this WHOLE file in
-- Supabase → SQL Editor → New query → Run. Idempotent & safe to run more than once.
-- Enables: editable budgets (kind), Online/social tracking, and Inventario POP.
-- ===========================================================================

-- ---- 0004: budget vs expense (lets you set & edit the monthly budget) ----
-- ===========================================================================
-- Adds the budget/expense distinction to the budgets table.
-- Run once in the Supabase SQL editor (needed for the Finance "monthly budget"
-- feature to persist in live mode).
-- ===========================================================================
alter table budgets add column if not exists kind text not null default 'expense';

-- ---- 0005: social snapshots (Online) ----
-- ===========================================================================
-- Social/online reputation tracking. Stores periodic snapshots of Instagram
-- (and other) metrics so the team can watch trends over time. Run once in the
-- Supabase SQL editor.
-- ===========================================================================
create table if not exists social_snapshots (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null default 'instagram',
  handle          text not null default '',
  captured_at     timestamptz not null default now(),
  followers       integer not null default 0,
  posts           integer not null default 0,
  avg_likes       numeric not null default 0,   -- likes por publicación
  avg_comments    numeric not null default 0,   -- comentarios por publicación
  engagement_rate numeric not null default 0,   -- %
  source          text not null default 'manual'
);
create index if not exists social_snapshots_captured_idx on social_snapshots (captured_at desc);

alter table social_snapshots enable row level security;
create policy "team read social" on social_snapshots for select using (auth.role() = 'authenticated');
create policy "admin manage social"
  on social_snapshots for all using (is_admin()) with check (is_admin());

-- ---- 0006: inventory + suppliers (Inventario POP) ----
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
