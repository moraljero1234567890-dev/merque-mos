-- ==========================================================================
-- Merquellantas MOS — one-paste setup. Run this whole file in the Supabase
-- SQL editor (Dashboard → SQL → New query). Then create the 3 users in
-- Authentication → Users and promote Jerónimo to admin (see supabase/README.md).
-- ==========================================================================

-- ===========================================================================
-- MOS — Marketing Operating System · Schema
-- Mirrors lib/types.ts. Postgres 15 / Supabase.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- enums ---
create type user_role        as enum ('admin', 'member');
create type department        as enum ('Brand', 'Content', 'Performance', 'CRM', 'Retail Marketing', 'Analytics');
create type priority          as enum ('low', 'medium', 'high', 'urgent');
create type project_status    as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
create type task_status       as enum ('backlog', 'todo', 'in_progress', 'waiting', 'done');
create type frequency         as enum ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly');
create type kpi_category      as enum ('marketing', 'cx', 'operations');
create type kpi_direction     as enum ('up', 'down');
create type doc_type          as enum ('folder', 'file');
create type report_format     as enum ('pdf', 'excel', 'csv');

-- -------------------------------------------------------------- profiles ---
-- One row per auth user. Created automatically by the handle_new_user trigger.
create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text not null default '',
  email           text not null,
  role            user_role not null default 'member',
  title           text not null default '',
  department      department not null default 'Brand',
  avatar_color    text,
  weekly_capacity numeric not null default 40,
  created_at      timestamptz not null default now()
);

-- -------------------------------------------------------------- projects ---
create table projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  owner_id     uuid references profiles (id) on delete set null,
  status       project_status not null default 'planning',
  priority     priority not null default 'medium',
  start_date   date,
  due_date     date,
  department   department not null default 'Brand',
  progress     int not null default 0 check (progress between 0 and 100),
  created_at   timestamptz not null default now()
);
create index on projects (status);
create index on projects (owner_id);

-- ----------------------------------------------------------------- tasks ---
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text default '',
  assignee_id     uuid references profiles (id) on delete set null,
  project_id      uuid references projects (id) on delete set null,
  status          task_status not null default 'todo',
  priority        priority not null default 'medium',
  due_date        date,
  estimated_hours numeric not null default 1,
  actual_hours    numeric not null default 0,
  notes           text,
  attachments     jsonb not null default '[]',
  recurring_id    uuid,
  meeting_id      uuid,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index on tasks (assignee_id);
create index on tasks (project_id);
create index on tasks (status);
create index on tasks (due_date);

-- -------------------------------------------------------- task_comments ---
create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks (id) on delete cascade,
  author_id  uuid references profiles (id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index on task_comments (task_id);

-- ------------------------------------------------------- recurring_tasks ---
create table recurring_tasks (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text not null default '',
  frequency            frequency not null default 'monthly',
  assignee_id          uuid references profiles (id) on delete set null,
  support              text,
  estimated_hours      numeric not null default 2,
  priority             priority not null default 'medium',
  department           department not null default 'Brand',
  anchor_date          date not null,
  active               boolean not null default true,
  last_generated_date  date,
  created_at           timestamptz not null default now()
);

-- ------------------------------------------------------- task_occurrences ---
-- Concrete materialization of a recurring definition on a given date.
create table task_occurrences (
  id            uuid primary key default gen_random_uuid(),
  recurring_id  uuid not null references recurring_tasks (id) on delete cascade,
  task_id       uuid references tasks (id) on delete set null,
  due_date      date not null,
  status        task_status not null default 'todo',
  created_at    timestamptz not null default now(),
  unique (recurring_id, due_date)
);
create index on task_occurrences (recurring_id);

alter table tasks
  add constraint tasks_recurring_fk
  foreign key (recurring_id) references recurring_tasks (id) on delete set null;

-- -------------------------------------------------------------- meetings ---
create table meetings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  date         timestamptz not null default now(),
  attendee_ids uuid[] not null default '{}',
  agenda       text not null default '',
  notes        text not null default '',
  decisions    text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------- meeting_actions ---
create table meeting_actions (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references meetings (id) on delete cascade,
  description text not null,
  assignee_id uuid references profiles (id) on delete set null,
  due_date    date,
  task_id     uuid references tasks (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table tasks
  add constraint tasks_meeting_fk
  foreign key (meeting_id) references meetings (id) on delete set null;

-- ------------------------------------------------------------- documents ---
create table documents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       doc_type not null,
  parent_id  uuid references documents (id) on delete cascade,
  file_kind  text,
  owner_id   uuid references profiles (id) on delete set null,
  url        text,
  size       bigint,
  updated_at timestamptz not null default now()
);
create index on documents (parent_id);

-- ------------------------------------------------------------------ kpis ---
create table kpis (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   kpi_category not null,
  owner_id   uuid references profiles (id) on delete set null,
  target     numeric not null,
  current    numeric not null default 0,
  unit       text not null default '',
  direction  kpi_direction not null default 'up',
  updated_at timestamptz not null default now()
);

create table kpi_updates (
  id      uuid primary key default gen_random_uuid(),
  kpi_id  uuid not null references kpis (id) on delete cascade,
  value   numeric not null,
  date    date not null default current_date,
  note    text
);
create index on kpi_updates (kpi_id);

-- --------------------------------------------------------- announcements ---
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references profiles (id) on delete set null,
  title      text not null,
  body       text not null default '',
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- reports ---
create table reports (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null,            -- workload | performance | project | kpi
  format      report_format not null default 'pdf',
  params      jsonb not null default '{}',
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------- activity_logs ---
create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  summary     text not null,
  created_at  timestamptz not null default now()
);
create index on activity_logs (created_at desc);

-- --------------------------------------------------------- notifications ---
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read);

-- --------------------------------------------------------------- budgets ---
create table budgets (
  id          uuid primary key default gen_random_uuid(),
  concept     text not null,
  department  department not null default 'Brand',
  category    text not null default 'Otros',
  month       text not null,            -- 'YYYY-MM'
  planned     numeric not null default 0,
  actual      numeric not null default 0,
  owner_id    uuid references profiles (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index on budgets (month);

-- ------------------------------------------------------ finance_categories ---
create table finance_categories (
  name       text primary key,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------- new-user handler ---
-- Auto-provision a profile when a user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'::user_role
         else 'member'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ===========================================================================
-- MOS — Row Level Security
-- Model: every authenticated team member can read the shared workspace
-- (single source of truth). Writes are allowed for members, with destructive
-- and admin-only surfaces (users, reports config) gated to admins.
-- ===========================================================================

-- is_admin() is SECURITY DEFINER so policies can check role without recursing
-- into the profiles RLS policy.
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles        enable row level security;
alter table projects        enable row level security;
alter table tasks           enable row level security;
alter table task_comments   enable row level security;
alter table recurring_tasks enable row level security;
alter table task_occurrences enable row level security;
alter table meetings        enable row level security;
alter table meeting_actions enable row level security;
alter table documents       enable row level security;
alter table kpis            enable row level security;
alter table kpi_updates     enable row level security;
alter table announcements   enable row level security;
alter table reports         enable row level security;
alter table activity_logs   enable row level security;
alter table notifications   enable row level security;
alter table budgets         enable row level security;
alter table finance_categories enable row level security;

-- ----------------------------------------------------------- profiles ---
create policy "profiles readable by team"
  on profiles for select using (auth.role() = 'authenticated');
create policy "update own profile"
  on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles"
  on profiles for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Shared operational tables: team can read + write; admins can do everything.
-- A helper macro pattern is repeated per table (Postgres has no policy macros).
-- ---------------------------------------------------------------------------

-- projects
create policy "team read projects"   on projects for select using (auth.role() = 'authenticated');
create policy "team write projects"  on projects for insert with check (auth.role() = 'authenticated');
create policy "team update projects" on projects for update using (auth.role() = 'authenticated');
create policy "admin delete projects" on projects for delete using (is_admin());

-- tasks
create policy "team read tasks"   on tasks for select using (auth.role() = 'authenticated');
create policy "team write tasks"  on tasks for insert with check (auth.role() = 'authenticated');
create policy "team update tasks" on tasks for update using (auth.role() = 'authenticated');
create policy "team delete own or admin tasks"
  on tasks for delete using (assignee_id = auth.uid() or is_admin());

-- task_comments
create policy "team read comments"  on task_comments for select using (auth.role() = 'authenticated');
create policy "author write comments"
  on task_comments for insert with check (author_id = auth.uid());
create policy "author or admin delete comments"
  on task_comments for delete using (author_id = auth.uid() or is_admin());

-- recurring_tasks (admin-configured, team-readable)
create policy "team read recurring"  on recurring_tasks for select using (auth.role() = 'authenticated');
create policy "admin manage recurring"
  on recurring_tasks for all using (is_admin()) with check (is_admin());

-- task_occurrences
create policy "team read occurrences"  on task_occurrences for select using (auth.role() = 'authenticated');
create policy "team write occurrences" on task_occurrences for insert with check (auth.role() = 'authenticated');
create policy "team update occurrences" on task_occurrences for update using (auth.role() = 'authenticated');

-- meetings
create policy "team read meetings"  on meetings for select using (auth.role() = 'authenticated');
create policy "team write meetings" on meetings for insert with check (auth.role() = 'authenticated');
create policy "team update meetings" on meetings for update using (auth.role() = 'authenticated');
create policy "admin delete meetings" on meetings for delete using (is_admin());

-- meeting_actions
create policy "team read actions"  on meeting_actions for select using (auth.role() = 'authenticated');
create policy "team write actions" on meeting_actions for insert with check (auth.role() = 'authenticated');
create policy "team update actions" on meeting_actions for update using (auth.role() = 'authenticated');

-- documents
create policy "team read documents"  on documents for select using (auth.role() = 'authenticated');
create policy "team write documents" on documents for insert with check (auth.role() = 'authenticated');
create policy "team update documents" on documents for update using (auth.role() = 'authenticated');
create policy "owner or admin delete documents"
  on documents for delete using (owner_id = auth.uid() or is_admin());

-- kpis (admin-owned targets, team-readable)
create policy "team read kpis"  on kpis for select using (auth.role() = 'authenticated');
create policy "team update kpis" on kpis for update using (auth.role() = 'authenticated');
create policy "admin manage kpis"
  on kpis for all using (is_admin()) with check (is_admin());

-- kpi_updates
create policy "team read kpi updates"  on kpi_updates for select using (auth.role() = 'authenticated');
create policy "team write kpi updates" on kpi_updates for insert with check (auth.role() = 'authenticated');

-- announcements
create policy "team read announcements"  on announcements for select using (auth.role() = 'authenticated');
create policy "admin manage announcements"
  on announcements for all using (is_admin()) with check (is_admin());

-- reports (admin only)
create policy "admin read reports"   on reports for select using (is_admin());
create policy "admin manage reports" on reports for all using (is_admin()) with check (is_admin());

-- activity_logs (team-readable feed, insert by any member, no edits)
create policy "team read activity"  on activity_logs for select using (auth.role() = 'authenticated');
create policy "team write activity" on activity_logs for insert with check (actor_id = auth.uid());

-- notifications (private to the recipient)
create policy "read own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "update own notifications"
  on notifications for update using (user_id = auth.uid());
create policy "system insert notifications"
  on notifications for insert with check (auth.role() = 'authenticated');

-- budgets (team-readable; managed by admins)
create policy "team read budgets" on budgets for select using (auth.role() = 'authenticated');
create policy "admin manage budgets"
  on budgets for all using (is_admin()) with check (is_admin());

-- finance_categories (team-readable; managed by admins)
create policy "team read finance cats" on finance_categories for select using (auth.role() = 'authenticated');
create policy "admin manage finance cats"
  on finance_categories for all using (is_admin()) with check (is_admin());
