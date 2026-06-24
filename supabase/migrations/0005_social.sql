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
