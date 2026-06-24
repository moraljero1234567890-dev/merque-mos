# Supabase backend — Merqueo MOS

The app ships in **demo mode** (localStorage seed data) so it runs with zero
config. To go live:

## 1. Create a project
[supabase.com](https://supabase.com) → New project. Grab the **Project URL** and
**anon public key** from *Project Settings → API*.

## 2. Configure env
```bash
cp .env.local.example .env.local
# paste NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 3. Run the migrations
Either via the SQL editor (paste each file in order) or the CLI:
```bash
supabase link --project-ref <ref>
supabase db push        # applies migrations/0001_schema.sql then 0002_rls.sql
```
- `0001_schema.sql` — enums, all 15 tables, indexes, and the `handle_new_user`
  trigger that auto-creates a `profiles` row on signup.
- `0002_rls.sql` — Row Level Security: the team shares one workspace (read +
  write for authenticated members) with destructive / config surfaces gated to
  admins via the `is_admin()` security-definer function.

## 4. Create the three users
In *Authentication → Users → Add user* (check **Auto Confirm User** — email
confirmation is on), create each with their password:
- `jeronimo.morales@merquellantas.com` — `JeronimoMorales123` (admin)
- `alejandro@merquellantas.com`
- `andres@merquellantas.com`

The `handle_new_user` trigger auto-creates their `profiles` row. Then promote
Jerónimo to admin in the SQL editor:
```sql
update profiles set role = 'admin', title = 'Head of Marketing'
where email = 'jeronimo.morales@merquellantas.com';
```
(Optionally set names/titles for the other two the same way.)

## Auth flow
- `proxy.ts` (this Next.js version renamed `middleware` → `proxy`) refreshes the
  session on every request and redirects unauthenticated users to `/login`.
- `app/auth/callback/route.ts` exchanges magic-link / OAuth codes for a session.
- `lib/supabase/{client,server,middleware}.ts` return `null` when env is absent,
  which is what keeps demo mode working.

## Data layer
`lib/store.tsx` is the client store the UI binds to. In demo mode it hydrates
from `lib/seed.ts`. The schema in `migrations/` mirrors `lib/types.ts` 1:1, so a
Supabase-backed store is a drop-in swap of the persistence functions.
