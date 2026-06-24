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
  kind        text not null default 'expense',  -- 'budget' (planned) | 'expense' (actual)
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
