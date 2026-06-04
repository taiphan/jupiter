# Jupiter — System architecture & data flow

High-level view of how the app is deployed, how layers interact, and where data is stored. For table-level detail see **[DATABASE.md](./DATABASE.md)**.

---

## 1. Deployment architecture

Jupiter is a **single Next.js 16 monolith** with two common runtimes and optional PostgreSQL.

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser / React UI]
  end

  subgraph hosting [Hosting]
    Vercel[Vercel — Production and Preview]
    Docker[Docker Compose — Local / OrbStack]
  end

  subgraph app [Jupiter App — Next.js 16]
    Pages[App Router pages — RSC + client components]
    API[Route Handlers — /api/auth/* /api/workspace]
    Server[Server modules — Drizzle, auth, workspace repo]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
    LS[(Browser localStorage)]
  end

  subgraph external [External]
    Google[Google OAuth]
    SMTP[Email — console or SMTP]
  end

  Browser --> Vercel
  Browser --> Docker
  Vercel --> Pages
  Vercel --> API
  Docker --> Pages
  Docker --> API
  API --> Server
  Pages --> Server
  Server --> PG
  Browser --> LS
  API --> Google
  Server --> SMTP
```

| Environment | Build command | Database | Typical URL |
|-------------|---------------|----------|-------------|
| **Vercel** | `next build` via `npm run build` | Managed Postgres (`POSTGRES_URL`) | Production alias (e.g. `v0-jupiter.vercel.app`) |
| **Docker** | `next build` inside image | Postgres service in `docker-compose.yml` | `http://localhost:3100` |
| **Dev (no DB)** | `npm run dev` | None — client-only demo auth | `http://localhost:3100` |

**Env resolution:** the server reads `DATABASE_URL` or Vercel’s `POSTGRES_URL` (see `src/server/env.ts`). `APP_URL` / `VERCEL_PROJECT_PRODUCTION_URL` drive OAuth redirects and email links.

---

## 2. Application layers

```mermaid
flowchart LR
  subgraph ui [UI layer — client]
    Views[Pages: board, backlog, list, calendar, settings]
    Components[shadcn/ui components]
    Stores[Zustand stores]
    WS[WorkspaceSync]
  end

  subgraph api [API layer — server]
    AuthRoutes[/api/auth/*]
    WorkspaceRoutes[/api/workspace]
  end

  subgraph domain [Domain / persistence]
    Mappers[DB mappers]
    Repo[workspace/repository]
    AuthSvc[auth: session, tokens, Google]
    Drizzle[Drizzle ORM]
  end

  Views --> Components
  Components --> Stores
  WS --> Stores
  WS --> WorkspaceRoutes
  Views --> AuthRoutes
  Stores --> Components
  WorkspaceRoutes --> Repo
  AuthRoutes --> AuthSvc
  Repo --> Mappers
  Repo --> Drizzle
  AuthSvc --> Drizzle
  Drizzle --> PG[(PostgreSQL)]
```

### Zustand stores (workspace)

| Store | Responsibility |
|-------|----------------|
| `projects-store` | Projects, members |
| `issues-store` | Issues, comments, activity, attachments |
| `sprints-store` | Sprints (burndown snapshots stay local-only) |
| `issue-links-store` | Directed issue relationships |
| `custom-fields-store` | Per-project field definitions |
| `quick-filters-store` | Saved board/backlog filter chips |
| `auth-store` | Current user + session hydration |

### Key server modules

| Path | Role |
|------|------|
| `src/server/db/schema.ts` | Drizzle table definitions |
| `src/server/db/mappers.ts` | Row ↔ client type mapping |
| `src/server/workspace/repository.ts` | `loadWorkspace` / `saveWorkspace` |
| `src/server/auth/*` | Login, register, Google, sessions |
| `src/components/workspace/workspace-sync.tsx` | Hydrate + debounced PUT sync |

---

## 3. Auth data flow (v1.6 / v1.7)

```mermaid
sequenceDiagram
  participant U as User
  participant UI as LoginForm / auth-store
  participant API as /api/auth/*
  participant S as session + users Postgres
  participant G as Google OAuth

  U->>UI: Email + password OR Google button
  alt Email login DB configured
    UI->>API: POST /api/auth/login
    API->>S: Verify user + password check emailVerified
    API-->>UI: Set jupiter_session cookie + user JSON
  else No DB dev offline
    UI->>UI: Match DEMO_ACCOUNTS in memory
  else Google AUTH_GOOGLE_ENABLED
    UI->>API: GET /api/auth/google
    API->>G: Redirect to Google
    G->>API: GET /api/auth/google/callback
    API->>S: Link or create user + oauth_accounts
    API-->>UI: Redirect + session cookie
  end
  UI->>API: GET /api/auth/me on load
  API->>S: Read session to user
  API-->>UI: User + googleConnected flags
```

**Postgres tables (auth):** `users`, `sessions`, `auth_tokens`, `oauth_accounts`

---

## 4. Workspace data flow (Postgres sync)

When Postgres is configured, tracker data is the **source of truth** in the database; the UI still updates **Zustand first** for responsiveness.

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Board / Issues UI
  participant Z as Zustand stores
  participant LS as localStorage
  participant WS as WorkspaceSync
  participant API as /api/workspace
  participant R as repository
  participant DB as PostgreSQL

  Note over WS,DB: After login email verified
  WS->>API: GET /api/workspace
  alt DB empty
    API-->>WS: empty true
    WS->>API: POST /api/workspace/seed
    API->>R: saveWorkspace demo snapshot
    R->>DB: Upsert projects issues sprints
    WS->>API: GET /api/workspace
  end
  API->>R: loadWorkspace
  R->>DB: SELECT workspace tables
  R-->>API: WorkspaceSnapshot
  API-->>WS: JSON snapshot
  WS->>Z: applyWorkspaceSnapshot
  Z->>LS: persist via Zustand middleware

  U->>UI: Create issue / move card / edit sprint
  UI->>Z: store mutation
  Z->>LS: persist cache
  Z-->>WS: subscribe fires
  WS->>WS: debounce 800ms
  WS->>API: PUT /api/workspace full snapshot
  API->>R: saveWorkspace snapshot
  R->>DB: Transaction upsert + delete orphans
```

**API contract**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/workspace` | Full snapshot, or `{ empty: true }` |
| `PUT` | `/api/workspace` | Upsert snapshot from client stores |
| `POST` | `/api/workspace/seed` | Demo data (any user if empty; admin if not) |

**Design note:** sync uses a **full snapshot** PUT (simple for demo/small teams), not per-resource REST yet. The UI updates immediately; Postgres catches up after ~800ms debounce.

---

## 5. Storage map — what lives where

```mermaid
flowchart TB
  subgraph browser [Browser]
    direction TB
    Z[Zustand in-memory state]
    L[localStorage cache + offline dev]
    Z --- L
  end

  subgraph postgres [PostgreSQL source of truth when configured]
    direction TB
    A[Auth: users sessions tokens oauth]
    W[Workspace: projects issues sprints comments activity attachments links custom_fields quick_filters]
  end

  subgraph v18 [v1.8 Postgres APIs]
    NR2[notification_reads]
    BD2[burndown_snapshots]
    WE[workspace_events]
  end

  browser -->|GET PUT /api/workspace| W
  browser -->|/api/auth/*| A
  browser --> localOnly
```

---

## 6. Database entity model

```mermaid
erDiagram
  users ||--o{ sessions : has
  users ||--o{ auth_tokens : has
  users ||--o{ oauth_accounts : has
  users ||--o{ project_members : member
  projects ||--o{ project_members : has
  projects ||--o{ sprints : has
  projects ||--o{ issues : has
  projects ||--o{ custom_fields : defines
  projects ||--o{ quick_filters : has
  issues ||--o{ comments : has
  issues ||--o{ activity : has
  issues ||--o{ attachments : has
  issues ||--o{ issue_links : from_to
  sprints ||--o{ issues : contains
  users ||--o{ issues : reports_assigned
```

Column-level notes: **[DATABASE.md](./DATABASE.md)**.

---

## 7. Example request path — move issue on board

```mermaid
flowchart TD
  A[KanbanBoard dnd-kit] --> B[issues-store.moveIssue]
  B --> C[Update rank + status in Zustand]
  C --> D[Append activity in memory]
  D --> E[localStorage persist]
  E --> F[WorkspaceSync debounce]
  F --> G[collectWorkspaceSnapshot]
  G --> H[PUT /api/workspace]
  H --> I[saveWorkspace transaction]
  I --> J[(issues + activity tables)]
  C --> K[React re-render immediate UI]
```

---

## 8. Mental model

1. **UI is client-first** — React reads/writes Zustand; `localStorage` caches state for fast reload and offline dev.
2. **Auth is server-authoritative** when Postgres exists — cookie session, email/Google flows, no secrets in the bundle.
3. **Workspace sync is snapshot-based** — load once after login; debounced PUT keeps Postgres aligned with stores.
4. **v1.8 APIs** — `notification_reads`, `burndown_snapshots`, and `workspace_events` sync via targeted routes (see [v1.8-persistence-requirements.md](./v1.8-persistence-requirements.md)).

---

## Related docs

- [DATABASE.md](./DATABASE.md) — tables, columns, seed commands
- [v1.6-auth-requirements.md](./v1.6-auth-requirements.md) — email auth
- [v1.7-google-sign-in-requirements.md](./v1.7-google-sign-in-requirements.md) — Google OAuth
- [v1.8-persistence-requirements.md](./v1.8-persistence-requirements.md) — notifications, audit API, burndown tables
- [../README.md](../README.md) — runbooks (Vercel, Docker, demo accounts)
