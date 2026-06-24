-- ===========================================================================
-- Optional hardening: per-user data isolation at the database level.
-- After this, a member can only READ their own tasks / recurring work; admins
-- still read everything (needed for the Admin cockpit). Run this once in the
-- Supabase SQL editor if you want isolation enforced by the DB, not just the UI.
-- ===========================================================================

-- tasks: own (as assignee) or admin
drop policy if exists "team read tasks" on tasks;
create policy "read own or admin tasks"
  on tasks for select
  using (assignee_id = auth.uid() or is_admin());

-- recurring_tasks: own (as assignee) or admin
drop policy if exists "team read recurring" on recurring_tasks;
create policy "read own or admin recurring"
  on recurring_tasks for select
  using (assignee_id = auth.uid() or is_admin());
