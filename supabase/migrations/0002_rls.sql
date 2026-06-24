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
