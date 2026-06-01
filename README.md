<h1 align="center">Jira Clone</h1>

<p align="center">
  <strong>A lightweight project tracker inspired by Jira.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4" alt="Tailwind" />
</p>

---

## Overview

Project tracker built with the same shell as Collection Portal — Next.js 16, Tailwind v4,
shadcn/ui, Zustand persisted state, role-based access. Adapted to model **projects**,
**issues**, **boards**, and **comments** instead of debt collection cases.

## Features (v1.0 MVP)

- **Projects** — create, list, view; each project has a key (e.g. `PROJ`)
- **Issues** — types (epic/story/task/bug/subtask), priorities, statuses, assignees, labels, parent/child
- **Kanban board** — drag-and-drop between columns (To Do / In Progress / In Review / Done)
- **Backlog** — flat list view per project with quick filters
- **Issue detail panel** — comments, activity log, inline edits
- **My Work** — global dashboard of issues assigned to you
- **Role-based access** — admin / lead / member / viewer with route guard and filtered nav
- **Search & filters** — by type, status, priority, assignee, label
- **Light / dark theme** — Atlassian-blue palette with theme toggle

Deferred to v1.1+: sprints + burndown, workflow editor, advanced reports, audit log,
JQL-style query builder, attachments, automations, notifications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | shadcn/ui + Base UI + Radix |
| Styling | Tailwind CSS v4 |
| State | Zustand with localStorage persistence |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Validation | Zod |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator (full access) |
| `lead` | `lead123` | Project Lead |
| `member` | `member123` | Team Member |
| `viewer` | `viewer123` | Read-only Viewer |

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # My Work dashboard
│   ├── projects/             # Project list & detail (board, backlog, settings)
│   ├── issues/               # Global issue search
│   ├── people/               # Team members
│   └── settings/             # App settings
├── components/
│   ├── ui/                   # Reusable primitives (shadcn)
│   ├── layout/               # Sidebar, header, route guard, theme
│   ├── auth/                 # Login form
│   ├── board/                # Kanban board, columns, cards
│   ├── issue/                # Issue panel, comment thread
│   └── dashboard/            # My Work widgets
└── lib/
    ├── auth-store.ts         # Authentication state
    ├── permissions.ts        # Role-based access
    ├── theme-store.ts        # Theme preferences
    ├── projects-store.ts     # Projects CRUD
    ├── issues-store.ts       # Issues CRUD + comments + activity
    ├── seed.ts               # Demo data
    ├── types.ts              # Domain types + zod schemas
    └── utils.ts              # cn helper, formatters
```

## License

MIT
