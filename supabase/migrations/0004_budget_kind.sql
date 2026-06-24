-- ===========================================================================
-- Adds the budget/expense distinction to the budgets table.
-- Run once in the Supabase SQL editor (needed for the Finance "monthly budget"
-- feature to persist in live mode).
-- ===========================================================================
alter table budgets add column if not exists kind text not null default 'expense';
