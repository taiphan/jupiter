# AGENTS.md

## Cursor Cloud specific instructions

Jupiter is a single Next.js 16 app (npm, port **3100**) with optional PostgreSQL for auth and workspace persistence.

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| Next.js dev server | **Yes** | `npm run dev` → http://localhost:3100 |
| PostgreSQL 16 | **Recommended** | Without it, UI works in client-only demo mode; auth APIs and `/api/workspace` need Postgres |

### First-time / after VM restart (not in update script)

1. **Docker daemon** — Docker is installed but may not be running. Start if needed:
   ```bash
   sudo dockerd > /tmp/dockerd.log 2>&1 &
   ```
   Use `sudo docker …` (user is not in the `docker` group by default).

2. **Postgres** — from repo root:
   ```bash
   sudo docker compose up -d postgres
   ```
   Host URL: `postgresql://jupiter:jupiter@localhost:15432/jupiter`

3. **App env** — create `.env.local` (gitignored) with at least:
   ```
   DATABASE_URL=postgresql://jupiter:jupiter@localhost:15432/jupiter
   AUTH_SECRET=dev-jupiter-auth-secret
   APP_URL=http://localhost:3100
   EMAIL_PROVIDER=console
   ```

4. **Schema + seed** (once per fresh Postgres volume):
   ```bash
   export DATABASE_URL=postgresql://jupiter:jupiter@localhost:15432/jupiter
   npm run db:push:host && npm run db:seed:host
   ```

### Standard commands

See `README.md` and `package.json` scripts:

- **Dev:** `npm run dev`
- **Lint:** `npm run lint` (may report pre-existing React hooks warnings/errors)
- **Test:** `npm test` (Vitest, no running services)
- **Build:** `npm run build`
- **Full Docker stack:** `npm run deploy` (builds app image + Postgres; slower than host dev)

### Demo login (after `db:seed:host`)

- Email: `taiphantuan@gmail.com`
- Password: `admin123`

### Gotchas

- **Login rate limit:** `/api/auth/login` allows 5 attempts per 15 minutes per IP. Restart `npm run dev` to clear the in-memory limiter during heavy testing.
- **Kanban route:** board is `/projects/{KEY}` (e.g. `/projects/WEB`), not `/projects/WEB/board`.
- **Playwright / automated login:** after API login succeeds, navigate manually — the login page does not auto-redirect; zustand session is set client-side.
- **Host dev vs Docker:** prefer `npm run dev` on the host for fast iteration; use `npm run deploy` only when you need the production Docker image.
