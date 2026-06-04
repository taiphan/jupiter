<h1 align="center">Jupiter</h1>

<p align="center">
  <strong>A lightweight project tracker inspired by Atlassian Jira.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.5-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4" alt="Tailwind" />
</p>

---

## Overview

Jupiter mirrors core **Jira Software** workflows — projects, issues, boards, sprints, and reports — using Next.js 16, Tailwind v4, shadcn/ui, and Zustand persisted state with role-based access.

Full feature mapping vs [Atlassian Jira](https://www.atlassian.com/software/jira/features): see **[REQUIREMENTS.md](./REQUIREMENTS.md)**.  
**Next release:** [v1.5 requirements](./docs/v1.5-requirements.md) · [v1.5 tasks](./tasks/v1.5-todo.md)

## Features (v1.5)

### Plan & track
- **Projects** — keys, leads, members, settings
- **Issues** — epic / story / task / bug / subtask, priorities, statuses, labels, parent/child, story points, **due dates**
- **Kanban board** — drag-and-drop columns (configurable per project)
- **Backlog** — reorder, sprint assignment
- **Sprints** — plan, active sprint board, burndown
- **List view** — spreadsheet-style table with sort, epic grouping, filters
- **Calendar view** — month grid by due date, drag to reschedule
- **Timeline** — project timeline view

### Collaborate
- **Issue detail** — comments, @mentions, activity log, attachments, issue links (blocks / relates / duplicates)
- **Notifications** — in-app bell for mentions and assignments
- **My Work** — assigned, reported, and recently updated issues

### Search & configure
- **Filters** — basic filters + JQL-lite query mode (incl. `dueDate`)
- **Quick filters** — saved chips on board and backlog
- **Workflow transition rules** — role-based status changes (viewers read-only by default)
- **Custom fields** — per-project field definitions
- **Board config** — map statuses to columns + transition rules
- **Audit log** — workspace change history (admin/viewer)

### Reports
- **Burndown**, **velocity**, **cumulative flow**

### Platform
- **Role-based access** — admin / lead / member / viewer
- **Auth** — email + password, verification, password reset; Google Sign-In (Docker + env)
- **Light / dark theme** — Atlassian-style UI

### Planned next
- **v1.8+** — dashboards, watchers, CSV export — see [REQUIREMENTS.md](./REQUIREMENTS.md#recommended-roadmap-jira-aligned)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | shadcn/ui + Base UI + Radix |
| Styling | Tailwind CSS v4 |
| State | Zustand with localStorage persistence |
| Database (opt-in) | Drizzle ORM + PostgreSQL |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Validation | Zod |
| Tests | Vitest |

## Getting Started

### Local (macOS Node)

```bash
npm install
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

```bash
npm test           # run tests (host)
npm run build:app  # Next.js build on the Mac
npm run start:app  # serve a local build
```

### OrbStack / Docker (build runs in Linux, not on the Mac host)

Requires [OrbStack](https://orbstack.dev) or Docker Desktop.

```bash
npm install
npm run deploy     # build image + start app + Postgres
# or: npm run build && npm run start
```

Open [http://localhost:3100](http://localhost:3100). First-time DB setup:

```bash
npm run db:setup   # schema + demo users (admin / admin123, …)
```

```bash
npm run deploy:logs   # tail app logs
npm run deploy:down   # stop stack
```

### How data works

| Layer | What it stores |
|-------|----------------|
| **Browser (Zustand)** | Projects, issues, sprints, board state — `localStorage` |
| **Postgres (Docker)** | Users, sessions — `/api/auth/*` when `DATABASE_URL` is set |

Login uses the **auth API** when Postgres is available (OrbStack deploy); otherwise it falls back to client-only demo accounts. Issue data is still per-browser until a future API sync.

## Demo accounts (email sign-in)

Use after `npm run db:setup` in Docker, or in dev mode without a database:

| Email | Password | Role |
|-------|----------|------|
| `alex@acme.dev` | `admin123` | Administrator |
| `maya@acme.dev` | `lead123` | Project Lead |
| `jordan@acme.dev` | `member123` | Team Member |
| `sam@acme.dev` | `viewer123` | Viewer |

## Google Sign-In (optional)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create **OAuth 2.0 Client ID** (type **Web application**).
3. **Authorized JavaScript origins:** `http://localhost:3100` (and your production `APP_URL`).
4. **Authorized redirect URIs:** `{APP_URL}/api/auth/google/callback`  
   Example local: `http://localhost:3100/api/auth/google/callback`
5. Add to `.env` (or Docker Compose env):

```bash
AUTH_GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
APP_URL=http://localhost:3100
# Optional: restrict to Google Workspace domain
# GOOGLE_ALLOWED_HD=yourcompany.com
```

6. Restart the app: `docker compose up -d --build app` or `npm run dev`.

Full spec: [docs/v1.7-google-sign-in-requirements.md](./docs/v1.7-google-sign-in-requirements.md).

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # My Work (For You)
│   ├── projects/             # Project list, board, backlog, sprints, reports
│   ├── issues/               # Global filters / JQL-lite
│   ├── people/               # Team members
│   ├── audit/                # Audit log
│   ├── settings/             # App settings
│   └── api/auth/             # Session auth routes
├── components/
│   ├── ui/                   # shadcn primitives
│   ├── layout/               # Top nav, sidebar, route guard
│   ├── board/                # Kanban + sprint board
│   ├── issue/                # Issue dialog, filters, rows
│   └── sprint/               # Sprint dialogs
├── lib/                      # Zustand stores, JQL, permissions, seed
└── server/                   # Drizzle schema, auth, DB client
```

## License

MIT
