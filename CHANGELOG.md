# Changelog

## [1.18.1] — 2026-06-05

### Bug fixes

- **Create issue dialog:** `useMemo` after early return (Rules of Hooks)
- **Timeline:** subtasks under non-epic stories missing; `buildTimelineRows` hierarchy helper
- **List view / subtasks:** inline status changes respect workflow transition rules
- **Transition rules editor:** remount on save instead of sync effect (stale draft)

## [1.18.0] — 2026-06-05

### Workflow transition rules editor (v1.18)

- **Transition rules matrix** in Board config: per-role from→to checkbox grid
- Role selector (Admin, Lead, Member, Viewer); row All/None shortcuts
- Save and reset to defaults; rules persist on `Project.transitionRules`
- Issue dialog status dropdown filtered to allowed targets only
- Enforced on board drag, list inline edit, and dialog (existing)

### Fixes

- **Issue dialog:** hooks called after early return (Rules of Hooks crash)
- **Transition rules:** partial project rules now merge with role defaults (no accidental allow-all)
- **Timeline:** Gantt bars use solid status colors instead of light badge classes

## [1.17.0] — 2026-06-05

### Timeline / Roadmap view (v1.17)

- **Gantt chart** at `/projects/{key}/timeline` — replaces placeholder
- **Hierarchical rows**: epics → child stories/tasks → subtasks; collapsible groups
- **Issue bars**: positioned from `startDate` (or `createdAt` fallback) to `dueDate`; status colour-coded; hover tooltip
- **Dependency arrows**: dashed red bezier lines with arrowheads for `blocks` links between issues in the same project
- **Today line**: red vertical marker with "Today" label
- **Zoom**: Week (40 px/day) · Month (14 px/day) · Quarter (6 px/day); zoom in/out buttons
- **Pan**: native horizontal scroll
- **startDate field** added to Issue (type, schema, mapper, store, dialog sidebar)
- `db:push` to add `start_date TEXT` column to issues table

## [1.16.0] — 2026-06-05

### Subtask / parent hierarchy UI (v1.16)

- **Subtask panel** in issue dialog — progress bar, collapsible list, inline status toggle; Add subtask with ↵ rapid entry
- **Parent breadcrumb** in issue dialog header — click to navigate to parent; Back button when navigating within dialog
- **In-dialog navigation** — clicking a subtask opens it in the same dialog; Back returns to parent
- **Parent field** in sidebar — search to set/change/remove parent; click to navigate to parent
- **Parent picker** in Create issue dialog — search by key or summary; pre-fills type to `subtask` when `defaultParentId` is set
- **Backlog indentation** — subtask rows are indented 20 px under their parent in sprint/backlog sections
- Persistence via existing workspace sync (no schema change needed — `parentId` was already in the issue model)

## [1.15.0] — 2026-06-05

### Issue links UI (v1.15)

- **Links panel** in issue dialog — view all links grouped by type (Blocks, Is blocked by, Relates to, Clones, Duplicates)
- **Add link** — live search by key or summary, type picker, cycle detection error messaging
- **Remove link** — hover ✕ button per row (respects `issues.edit` permission)
- **Blocked badge** on Kanban board cards — red `Blocked` badge when an issue has an active inbound blocker
- Persistence via existing workspace sync (`issue_links` table already wired)
- Activity log on both linked issues (`link-added` / `link-removed` kinds — already in audit filter)

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
