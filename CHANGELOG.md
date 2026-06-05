# Changelog

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
