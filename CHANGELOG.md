# Changelog

## [1.14.0] — 2026-06-05

### List view — spreadsheet mode (v1.14)

- **Column picker** — show/hide any column per-project (persisted to `localStorage`)
- **Group by** — none / epic / status / sprint / assignee / priority with collapsible groups
- **Inline cell editing** — change status, priority, assignee, and story points directly in the table without opening the dialog
- **Bulk select** — checkboxes + select-all for bulk status, assignee, priority change and delete
- **Export CSV** on the List page (respects active filters)
- **Labels column** — opt-in column showing issue label badges
- Fixed pre-existing test type errors (`watcherIds`, `for-you` duplicate key)

## [1.13.0] — 2026-06-04

### Dashboards & polish (v1.9)

- **Project dashboard** — `/projects/{key}/dashboard` with toggleable velocity, burndown, and cumulative flow widgets
- **My Work** — **Due soon** and **What changed** sections
- **CSV export** — issues (Filters page) and velocity (Reports page)
- **Issue email hooks** — `POST /api/notify/issue-event` when `ISSUE_EMAIL_NOTIFICATIONS=true`

## [1.12.0] — 2026-06-04

### Issue watchers (v1.12)

- **`watcherIds`** on issues — Postgres `watcher_ids` jsonb + workspace sync
- **Issue panel** — Watch / Unwatch, add/remove watchers (editors)
- **Notifications** — bell feed includes watched issues (client + `/api/notifications`)
- **My Work** — **Watching** section for followed open issues
- Reporter + assignee auto-watch on create; new assignee auto-added
- Activity kind `watcher` for watcher list changes

### Ops

- Run `npm run db:push:host` after upgrade

## [1.11.0] — 2026-06-03

### Auth breadth (v1.11)

- **Microsoft** and **GitHub** OAuth sign-in (PKCE for Microsoft; admin-configurable in Settings)
- **Session management** — list active sessions, revoke one, sign out other devices (`user_agent`, `ip_address` on sessions)
- **Personal access tokens** — `jpt_…` Bearer tokens; create/revoke in Settings; `requireUser()` accepts PAT or cookie
- **Set password** for OAuth-only accounts (`POST /api/auth/password/set`)
- Generic OAuth disconnect: `POST /api/auth/oauth/{provider}/disconnect`
- Login UI: social buttons for all enabled providers

### Schema

- `api_tokens` table; `workspace_auth_config` Microsoft/GitHub columns; extended `oauth_accounts.provider`

### Ops

- Run `npm run db:push:host` after upgrade

## [1.10.0] — 2026-06-04

### Authentication & security (v1.10)

- **Gmail / SMTP** transactional email for verify and password-reset (`nodemailer`, `EMAIL_PROVIDER=gmail`)
- **TOTP 2FA** — setup (QR), backup codes, login challenge at `/login/2fa`
- **Admin authentication settings** — Settings UI + `workspace_auth_config` (SMTP, Google OAuth, app URL, test email)
- API: `/api/auth/2fa/*`, `/api/admin/auth-settings` (GET/PUT + test email)
- Demo admin email: `taiphantuan@gmail.com`; other roles use `+lead` / `+member` / `+viewer` Gmail aliases
- Default test redirect: `taiphantuan@gmail.com` for auth mail in dev

### Dependencies

- `nodemailer`, `otplib`, `qrcode`

### Ops

- Run `npm run db:push:host` after upgrade (TOTP columns + `workspace_auth_config` + `totp_backup_codes`)
- `npm run test:auth` — integration smoke test for auth APIs

## [1.8.0] — workspace persistence

- Postgres workspace sync, notifications read API, audit pagination, burndown snapshots

## [1.7.0] — Google Sign-In

- OAuth 2.0 + PKCE, account linking

## [1.6.0] — Email authentication

- Register, verify, reset, server-side sessions
