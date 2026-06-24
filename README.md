# Merqueo MOS — Marketing Operating System

The single source of truth for a 26-store tire retailer's marketing department.
Projects, tasks, recurring rituals, KPIs, meetings, documents and reports — built
for daily operational execution. Design language: Linear / Vercel / Arc.

> Next.js 16 (App Router) · TypeScript · Tailwind v4 · Recharts · Supabase ·
> dark-mode native · mobile-first.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 — runs in zero-config DEMO mode
```

Demo mode needs **no backend**: the app hydrates from seeded data in
`localStorage`, recurring tasks auto-generate, and any credentials log in.

## Go live (Supabase)

```bash
cp .env.local.example .env.local   # fill the two values below
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key (`sb_publishable_…`). The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works. |

Then apply the migrations and promote an admin — see
[`supabase/README.md`](supabase/README.md). Architecture and folder map live in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run lint     # eslint
```
