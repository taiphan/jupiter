# AGENTS.md

## Cursor Cloud specific instructions

Jupiter is a single Next.js 16 app (not a monorepo). See `README.md` for product overview and `package.json` for scripts.

### Services

| Service | Port | When needed |
|---------|------|-------------|
| Next.js dev server | 3100 | Always for local development |
| PostgreSQL | 15432 (host) | Optional for UI-only dev; required for auth API, workspace sync, audit |

### Quick start (UI-only, no Docker)

```bash
npm run dev
```

Open http://localhost:3100. Demo sign-in works without a database (client-side demo accounts on the login page, or `alex@acme.dev` / `admin123`).

### Full stack (Postgres + auth APIs)

Requires Docker (or an external Postgres instance). Not available in all Cloud Agent VMs:

```bash
npm run deploy          # build + start app + Postgres
npm run db:setup        # schema + seed demo users
```

Host Postgres URL when using compose: `postgresql://jupiter:jupiter@localhost:15432/jupiter`

### Lint / test / build

| Command | Notes |
|---------|-------|
| `npm run lint` | ESLint; repo may have pre-existing `react-hooks/set-state-in-effect` errors |
| `npm test` | Vitest; 195 unit tests, no external services |
| `npm run build` | Production Next.js build |
| `npm run start:app` | Serve production build on port 3100 |

### Dev server in tmux

Long-running dev server should use a dedicated tmux session (e.g. `jupiter-dev-server`) so it survives across shell commands.

### Gotchas

- **No `DATABASE_URL`**: app uses Zustand + `localStorage` for projects/issues; auth falls back to demo mode.
- **`npm run db:*` without Docker**: use `npm run db:push:host` and `npm run db:seed:host` with `DATABASE_URL` pointing at a running Postgres.
- **OAuth / SMTP**: optional; defaults use `EMAIL_PROVIDER=console` (logs only). See `env.example`.
- **Project detail pages**: if you hit a Zustand `getSnapshot` infinite-loop error on `/projects/[key]`, it is a known UI bug; create/list flows still work from the Projects page and global Create menu.
