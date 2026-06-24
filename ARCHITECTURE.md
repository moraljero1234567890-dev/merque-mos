# Merqueo MOS — Architecture

The **Marketing Operating System**: the single source of truth for a 26-store
tire retailer's marketing department. Built for daily operational execution —
projects, tasks, recurring rituals, KPIs, meetings, documents and reports.

Design language: Linear / Vercel / Arc — neutral zinc canvas, one indigo accent,
hairline borders, soft elevation, subtle motion. Mobile-first, dark-mode native.

---

## 1. Product architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router · React 19 · client components) │
│                                                              │
│   Shell (sidebar · topbar · command palette · ⌘K)            │
│     └─ Pages bind to a single client store: useMos()         │
│                                                              │
│   Providers: ThemeProvider → MosProvider                     │
└───────────────┬──────────────────────────────────────────────┘
                │  (live mode)
        proxy.ts refreshes session, guards routes
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Supabase: Postgres + Auth + RLS                              │
│   15 tables mirroring lib/types.ts · is_admin() · triggers   │
└──────────────────────────────────────────────────────────────┘
```

**Two run modes, one codebase:**
- **Demo mode** (no env): `lib/store.tsx` hydrates from `lib/seed.ts` into
  `localStorage`. Recurring tasks auto-generate via `lib/recurring.ts`. Any
  login works. Zero config — ideal for evaluation and design review.
- **Live mode** (Supabase env set): `proxy.ts` + `lib/supabase/*` enforce real
  auth, sessions and Row Level Security. Schema in `supabase/migrations/`.

The store exposes a stable command API (`createTask`, `moveTask`, `addKpiUpdate`,
`convertActionToTask`, …) so swapping the persistence layer from localStorage to
Supabase calls is localized to `lib/store.tsx` — every page stays untouched.

---

## 2. Roles & access

| Capability                    | Admin | Member |
|-------------------------------|:-----:|:------:|
| View shared workspace         |  ✓    |  ✓     |
| Create/update projects, tasks |  ✓    |  ✓     |
| Log time, comments, KPI values|  ✓    |  ✓     |
| Configure recurring tasks     |  ✓    |  —     |
| Manage users / roles          |  ✓    |  —     |
| Reports & exports             |  ✓    |  ✓ *   |
| Admin cockpit (`/admin`)      |  ✓    |  —     |

\* Members can export their own views; admin sees the department-wide generator.
Enforced in UI (`isAdmin`) and at the database via RLS (`is_admin()`).

---

## 3. Folder structure

```
app/
  layout.tsx               Root: fonts, theme bootstrap, <Providers>
  page.tsx                 → redirect to /dashboard
  globals.css              Design tokens (oklch), motion, dark mode
  login/page.tsx           Split-panel auth (Supabase in live mode)
  auth/callback/route.ts   OAuth / magic-link code exchange
  (app)/                   Authenticated shell route group
    layout.tsx             <Shell>
    dashboard/page.tsx     "What should I work on today?"
    projects/page.tsx      Kanban · Table · Timeline + detail
    tasks/page.tsx         List · Board, filters, composer
    calendar/page.tsx      Month grid: deadlines + meetings
    recurring/page.tsx     Auto-generating recurring rituals
    kpis/page.tsx          Targets, trends, direction-aware progress
    meetings/page.tsx      Agendas → decisions → action items → tasks
    documents/page.tsx     OS-style file/folder repository
    reports/page.tsx       CSV / Excel / PDF generator
    admin/page.tsx         Team · workload · health · activity
    settings/page.tsx      Profile · appearance · preferences
components/
  shell, sidebar, topbar, command-palette, providers, theme
  ui.tsx                   Button, Card, Badge, Modal, Avatar, inputs…
  charts.tsx               AreaTrend, Sparkline, Bars, Donut, Gauge
  tasks.tsx                TaskRow, TaskComposer, dueMeta
  badges.tsx, page-header.tsx, nav.ts
lib/
  store.tsx                useMos() — the client data layer + commands
  types.ts                 Domain model (source of truth for schema)
  seed.ts                  Demo dataset, relative to "now"
  recurring.ts             Occurrence generation engine
  selectors.ts             Derived metrics (health, utilization, rates)
  labels.ts, utils.ts, export.ts
  supabase/{client,server,middleware}.ts
proxy.ts                   Session refresh + route guard (was middleware)
supabase/
  migrations/0001_schema.sql, 0002_rls.sql
  README.md                Go-live runbook
```

---

## 4. Component hierarchy

```
RootLayout
└─ Providers (Theme → Mos)
   └─ (app)/layout → Shell
      ├─ Sidebar (PRIMARY_NAV + SECONDARY_NAV, admin-gated)
      ├─ Topbar (title · ⌘K search · theme · notifications · user)
      ├─ CommandPalette (global search + actions, ⌘K)
      └─ main → <Page>
                 ├─ PageHeader / SectionTitle
                 ├─ Card · StatCard · Badge · Avatar · Progress · Ring
                 ├─ charts/* (recharts)
                 ├─ TaskRow · TaskComposer (shared)
                 └─ Modal (composers, detail panels)
```

Primitives live in `components/ui.tsx`; every page composes from them so the
visual language stays uniform. Pages are client components reading `useMos()`.

---

## 5. Data model

15 entities (see `lib/types.ts` ↔ `supabase/migrations/0001_schema.sql`):
`profiles, projects, tasks, task_comments, recurring_tasks, task_occurrences,
meetings, meeting_actions, documents, kpis, kpi_updates, announcements, reports,
activity_logs, notifications`.

Notable relationships: tasks → projects/assignee, tasks ← recurring_tasks
(generated occurrences), meeting_actions → tasks (action items become work),
documents self-reference via `parent_id` (folder tree), kpi_updates → kpis
(trend history).

---

## 6. Security (RLS)

- Every authenticated member reads the shared workspace (single source of truth).
- Members write operational tables (projects, tasks, comments, KPI values…).
- Destructive / configuration surfaces (user management, recurring config, KPI
  targets, reports, announcements) are gated to admins via the
  `is_admin()` SECURITY DEFINER function (avoids recursive policy evaluation).
- Notifications are private to their recipient.
- `handle_new_user` trigger provisions a `profiles` row on signup.

---

## 7. Implementation status & plan

**Shipped**
- ✅ Design system, shell, command palette, theme, charts
- ✅ Dashboard, Projects, Tasks, Calendar, Recurring, KPIs, Meetings,
     Documents, Reports, Admin, Settings
- ✅ Recurring-task generation engine, derived metrics/selectors
- ✅ CSV / Excel / PDF export
- ✅ Supabase schema + RLS migrations, auth (proxy + callback + login wiring)

**Go-live checklist** (`supabase/README.md`)
1. Create Supabase project, set `.env.local`.
2. Apply `0001_schema.sql` then `0002_rls.sql`.
3. Promote the first admin (`update profiles set role='admin' …`).
4. Swap the store's localStorage calls for Supabase queries (isolated to
   `lib/store.tsx`); the command API and all pages remain unchanged.

**Next**
- Realtime subscriptions for live collaboration (Supabase channels).
- File uploads to Supabase Storage for the Documents module.
- Scheduled job to materialize `task_occurrences` server-side.
- Email/push for notifications and weekly digests.
```
