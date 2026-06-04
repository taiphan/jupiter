# Jupiter — Requirements (aligned with Atlassian Jira)

Reference: [Jira Software features](https://www.atlassian.com/software/jira/features), [Spring 2026 release](https://www.atlassian.com/software/jira/release), [Rovo in Jira](https://www.atlassian.com/software/jira/ai).

Jupiter is a lightweight Jira-inspired tracker. This document maps **Atlassian Jira capabilities** to Jupiter **shipped**, **partial**, and **planned** work.

**Legend:** ✅ Shipped · 🟡 Partial · ⬜ Planned · — Out of scope (for now)

---

## 1. Plan & prioritize

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Projects / spaces with keys | Projects (`WEB`, `MOB`, …) | ✅ | Create, list, lead, description |
| Work item hierarchy (epic → story → subtask) | Issue types + `parentId` | ✅ | epic, story, task, bug, subtask |
| Backlog ordering | Backlog view + rank | ✅ | Drag-and-drop reorder |
| Sprints / iterations | Sprints store + sprint board | ✅ | Plan, start, complete; assign issues |
| Roadmap / timeline | Timeline view | 🟡 | Basic timeline; no dependency lines yet |
| Capacity / story points | `storyPoints` on issues | ✅ | Used in reports |
| Project templates | — | ⬜ | Atlassian: pre-built space templates |
| AI work breakdown (Rovo) | — | ⬜ | Atlassian: break epics into tasks via AI |

---

## 2. Track work (views)

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Kanban board | Board view | ✅ | Drag-and-drop columns |
| Scrum board | Sprint board | ✅ | Per-sprint filtered board |
| Backlog | Backlog tab | ✅ | Filter + reorder |
| Summary / space home | Summary tab | ✅ | KPIs and recent activity |
| **List view** (spreadsheet) | — | ⬜ | Atlassian Spring 2026: resizable columns, group by hierarchy |
| **Calendar view** | — | ⬜ | Jira: due-date calendar |
| **For You** home | My Work (`/`) | 🟡 | Assigned, reported, recent; not yet fully personalized |
| Board configuration | Board config | ✅ | Column ↔ status mapping per project |
| Quick filters on board | — | ⬜ | Jira: save filter chips on board |

---

## 3. Work items (issues)

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Types, priority, status | Core issue model | ✅ | |
| Assignee / reporter | ✅ | | |
| Labels | ✅ | | |
| Description + summary | Issue dialog inline edit | ✅ | |
| Comments | Comment thread | ✅ | |
| @mentions in comments | `derive/mentions` | ✅ | Notification on mention |
| Activity / history | Activity log | ✅ | Field changes, comments, links |
| Attachments | Attachments section | ✅ | Size-validated upload |
| Issue links | blocks / relates / duplicates | ✅ | Cycle detection on blocks |
| Custom fields | Fields tab + per-project defs | ✅ | text, number, select, date, user |
| Watchers | — | ⬜ | v1.9 |
| In-app notifications (read state) | Bell + activity-derived feed | 🟡 | Feed from `activity` in Postgres; read state localStorage only — **v1.8** |
| Votes | — | — | |
| Due dates / fix versions | — | ⬜ | |
| Subtasks on board | Parent/child in model | 🟡 | UI for subtask tree limited |

---

## 4. Search & filters

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Basic filters | Filters page + filter bar | ✅ | type, status, priority, assignee, project |
| Saved filter shortcuts | Nav → Filters menu | ✅ | Assigned to me, In progress, All |
| JQL | JQL-lite mode | 🟡 | Subset of JQL; not full parity |
| Cross-workspace search | Global search (nav) | 🟡 | Issues + projects by text |
| Rovo natural-language search | — | ⬜ | Atlassian AI search |

---

## 5. Reports & insights

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Burndown | Sprint + project reports | 🟡 | Charts work; snapshot history in localStorage only — **v1.8:** `burndown_snapshots` + API |
| Velocity | Rolling velocity chart | ✅ | |
| Cumulative flow | Reports view | ✅ | |
| **Custom dashboards per space** | — | ⬜ | Atlassian Spring 2026: widgets + Rovo insights |
| Export (CSV / Excel) | — | ⬜ | |
| Rovo-generated status updates | — | ⬜ | |

---

## 6. Collaborate & notify

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| In-app notifications | Bell + notifications store | ✅ | Mentions, assignments |
| Email notifications | — | ⬜ | |
| **Guest / external access** | — | ⬜ | Atlassian Spring 2026: free guest seats |
| Share link | — | ⬜ | |

---

## 7. Authentication & identity

Aligned with **SaaS breadth** (GitHub, Linear) and **enterprise** expectations (Jira Cloud, Atlassian Guard: SAML, SCIM, enforced 2FA).

### 7.1 Core (shipped)

| Capability | Jupiter | Status | Notes |
|------------|---------|--------|-------|
| **Email + password sign-in** | `/api/auth/login` | ✅ | Email is primary identifier |
| Email verification on sign-up | `/api/auth/register`, `/verify` | ✅ | Gmail SMTP when `EMAIL_PROVIDER=gmail`; console default |
| Password reset via email | `/forgot-password`, `/reset-password` | ✅ | Same mail pipeline as verify |
| Server-side sessions (cookies) | `/api/auth/me`, `/logout` | ✅ | HTTP-only `jupiter_session` |
| **Google Sign-In (OAuth 2.0 + PKCE)** | `/api/auth/google` | ✅ | Link/unlink; optional `GOOGLE_ALLOWED_HD` |
| Postgres users, sessions, OAuth | Drizzle | ✅ | `users`, `sessions`, `oauth_accounts`, `auth_tokens` |
| Rate limiting on auth | In-memory per IP | ✅ | Login, register, reset, OAuth |
| Roles (RBAC) | admin / lead / member / viewer | ✅ | Same for all login methods |
| Local demo mode (no DB) | `auth-store` + seed accounts | ✅ | Dev only |

### 7.1.1 Login & sign-up UI (required)

The **login** (`/login`) and **sign-up** (`/signup`) pages must expose every auth method the server has configured.

| ID | Requirement | Status |
|----|-------------|--------|
| FR-LOGIN-1 | On mount, call `GET /api/auth/config` (no auth required). | ✅ |
| FR-LOGIN-2 | Render **Continue with Google / Microsoft / GitHub** for each provider where config returns `*Auth: true`. | ✅ |
| FR-LOGIN-3 | Show a loading skeleton for social buttons until config loads (no silent empty flash). | ✅ |
| FR-LOGIN-4 | Always show **email + password** when `emailAuth` is true (Postgres mode). | ✅ |
| FR-LOGIN-5 | After password login with 2FA enabled, redirect to `/login/2fa`. | ✅ |
| FR-LOGIN-6 | Display OAuth error query params (`?error=`) with user-safe messages. | ✅ |
| FR-LOGIN-7 | Sign-up page uses the same social + email pattern as login. | ✅ |
| FR-LOGIN-8 | Provider availability = **enabled flag OR env** + **client ID + client secret** (DB and env merged). | ✅ |

**Ops:** If social buttons are missing in production, set **Settings → Authentication & email** (Google enabled + client ID + secret) **or** Vercel env: `AUTH_GOOGLE_ENABLED=true`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL=https://v0-jupiter.vercel.app`.

### 7.2 Security & delivery (v1.10) ✅

| Capability | Status | Notes |
|------------|--------|-------|
| Gmail / SMTP verify & reset email | ✅ | `nodemailer`; env or admin Settings |
| **TOTP 2FA** (authenticator apps) | ✅ | `/api/auth/2fa/*`; Settings + `/login/2fa` |
| **Admin auth settings UI** | ✅ | SMTP, Google, app URL; `workspace_auth_config` |
| Google OAuth + 2FA step-up | ⬜ stretch | Password login + 2FA shipped first |

### 7.3 Breadth (v1.11) ✅

| Capability | Status | Notes |
|------------|--------|-------|
| **Microsoft** (Entra ID) OAuth | ✅ | `/api/auth/microsoft`; login UI when configured |
| **GitHub** OAuth | ✅ | `/api/auth/github`; login UI when configured |
| **Apple** Sign In | ⬜ stretch | |
| Add password for OAuth-only users | ✅ | Settings → Set password |
| Sign out all devices / session list | ✅ | Settings → Active sessions |
| **Personal access tokens** (PAT) | ✅ | Bearer `jpt_…` for API/CI |
| CAPTCHA on auth (Turnstile/hCaptcha) | ⬜ stretch | After repeated failures |
| Breached-password check (HIBP) | ⬜ stretch | Register + password change |
| Per-user security activity log | ⬜ stretch | Login/OAuth/PAT events |

### 7.4 Enterprise (v2.0)

| Capability | Status | Notes |
|------------|--------|-------|
| **SAML 2.0 SSO** (SP) | ⬜ | Okta, Azure AD, Google Workspace SAML |
| **OIDC** federation (per org) | ⬜ | Alternative to SAML |
| **SCIM 2.0** provisioning | ⬜ | User/group sync from IdP |
| Organization + **enforce SSO** | ⬜ | Disable password/social when policy on |
| Org **require 2FA** policy | ⬜ | Block app until TOTP enrolled |
| **Invite-only** / email domain allowlist | ⬜ | `org_invites`, `allowed_email_domains` |
| **Auth audit log** (admin) | ⬜ | `auth_events` — login, SSO, 2FA, PAT |
| Break-glass admin login | ⬜ | Env allowlist when SSO enforced |
| WebAuthn / passkeys | ⬜ | **v2.1** stretch |

### 7.5 Out of scope (current)

| Capability | Notes |
|------------|-------|
| SMS / voice OTP | Use TOTP only |
| Magic-link-only passwordless | Non-goal |
| Multi-tenant billing / Atlassian Guard seats | — |
| Data residency regions | — |
| On-prem clustering | — |

**Specs:** [v1.6](./docs/v1.6-auth-requirements.md) · [v1.7](./docs/v1.7-google-sign-in-requirements.md) · [v1.10](./docs/v1.10-auth-security-requirements.md) · **[v1.11 + v2.0 enterprise & breadth](./docs/v2.0-auth-enterprise-breadth-requirements.md)**  
**Tasks:** [v1.6](./tasks/v1.6-auth-todo.md) · [v1.7](./tasks/v1.7-google-sign-in-todo.md) · [v1.10](./tasks/v1.10-auth-security-todo.md) · **[v2.0 auth](./tasks/v2.0-auth-enterprise-breadth-todo.md)**

---

## 8. Configure & administer

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Roles & permissions | admin / lead / member / viewer | ✅ | Route + action guards |
| Project settings | Settings tab | ✅ | Name, key, lead, members |
| Workflow editor (visual) | Status columns via board config | 🟡 | Column mapping only; no transition rules UI |
| Audit log | `/audit` | 🟡 | Issue `activity` in Postgres via workspace sync; read via client store — **v1.8:** paginated API + optional workspace events |
| **Authentication settings (admin)** | Settings → Authentication & email | ✅ | v1.10: SMTP, Google OAuth, 2FA flag, test email |
| **Delegated permissions / templates** | — | ⬜ | Atlassian Spring 2026 |
| **Beta feature toggles** | — | ⬜ | |
| Data residency / compliance | — | — | Enterprise Jira only |

---

## 9. Automations & integrations

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Automation rules (if X then Y) | — | ⬜ | Jira: status triggers, reminders |
| **AI agents in workflow** | — | ⬜ | Atlassian Spring 2026: assign work to agents |
| GitHub / Bitbucket / Slack | — | ⬜ | Jira: 3000+ marketplace integrations |
| Webhooks / REST API | Auth + workspace snapshot API | 🟡 | `/api/workspace` bulk sync; targeted APIs in **v1.8** |

---

## 10. AI (Rovo) — reference only

Atlassian’s 2026 direction ([Rovo in Jira](https://www.atlassian.com/software/jira/ai)):

- Assign tasks to AI agents from work items
- Natural-language search and summaries
- Auto-generate status updates, merge duplicates
- Rovo Dev: work item → code/PR
- Admin skills for workflow/permission setup

**Jupiter stance:** defer until core parity is solid; consider lightweight helpers (JQL suggestions, duplicate detection) before full agent platform.

---

## Release history (Jupiter)

| Version | Theme |
|---------|--------|
| **v1.0** | MVP — projects, issues, kanban, backlog, My Work, RBAC |
| **v1.1** | Sprints, velocity & burndown, Atlassian-style nav |
| **v1.2** | Board config, backlog DnD, cumulative flow, audit log |
| **v1.3** | Custom fields, JQL-lite, attachments, notifications |
| **v1.4** | Sprint board, issue links, auth API, Drizzle scaffold |
| **v1.5** | List & calendar views, due dates, workflow rules, quick filters |
| **v1.6** | Email authentication (register, verify, reset) |
| **v1.7** | Google Sign-In (OAuth 2.0 + PKCE) |
| **v1.8** | Workspace Postgres sync + persistence APIs |
| **v1.10** | Gmail SMTP verification mail + TOTP 2FA ✅ |
| **v1.11** | Auth breadth: Microsoft/GitHub OAuth, PAT, session revoke (planned) |
| **v2.0** | Enterprise identity: SAML, OIDC, SCIM, org policy (planned) |

---

## Recommended roadmap (Jira-aligned)

Priority order based on Atlassian core UX and Spring 2026 themes:

### v1.5 — Views & workflow ✅

**Spec:** [docs/v1.5-requirements.md](./docs/v1.5-requirements.md) · **Tasks:** [tasks/v1.5-todo.md](./tasks/v1.5-todo.md)

- List view (spreadsheet-style issue table)
- Calendar view (due dates)
- Workflow transition rules (who can move which status)
- Quick filters on board/backlog

### v1.6 — Email authentication ✅

**Spec:** [docs/v1.6-auth-requirements.md](./docs/v1.6-auth-requirements.md)

### v1.7 — Google Sign-In ✅

**Spec:** [docs/v1.7-google-sign-in-requirements.md](./docs/v1.7-google-sign-in-requirements.md)

### v1.8 — Persistence: notifications, audit, burndown ✅

**Spec:** [docs/v1.8-persistence-requirements.md](./docs/v1.8-persistence-requirements.md) · **Tasks:** [tasks/v1.8-persistence-todo.md](./tasks/v1.8-persistence-todo.md)

**Recommendation:** persist in **PostgreSQL**, access via **HTTP API** (not direct DB from the client).

| Area | v1.8 deliverable |
|------|------------------|
| Notifications | `notification_reads` + `/api/notifications` (feed still from `activity`) |
| Audit log | Paginated `GET /api/audit`; optional `workspace_events` for project/sprint actions |
| Burndown | `burndown_snapshots` + `/api/sprints/:id/burndown` |

Issue/project data continues via `/api/workspace` snapshot sync (shipped).

### v1.10 — Gmail delivery & TOTP 2FA ✅

**Spec:** [docs/v1.10-auth-security-requirements.md](./docs/v1.10-auth-security-requirements.md) · **Tasks:** [tasks/v1.10-auth-security-todo.md](./tasks/v1.10-auth-security-todo.md)

| Area | Deliverable |
|------|-------------|
| **Verify / reset email** | `nodemailer` + `EMAIL_PROVIDER=gmail` (or `console` for dev) |
| **2FA** | TOTP setup/enable/challenge/disable; backup codes; `/login/2fa` |

> Use **SMTP to send** mail. IMAP is for reading inbox — not used in v1.10.

### v1.11 — Auth breadth ⬜

**Spec:** [docs/v2.0-auth-enterprise-breadth-requirements.md](./docs/v2.0-auth-enterprise-breadth-requirements.md) (Part A) · **Tasks:** [tasks/v2.0-auth-enterprise-breadth-todo.md](./tasks/v2.0-auth-enterprise-breadth-todo.md)

| Area | Deliverable |
|------|-------------|
| **Social login** | Microsoft Entra, GitHub OAuth (+ Apple stretch) |
| **Account** | Set password for OAuth-only users |
| **Sessions** | List / revoke sessions; sign out everywhere |
| **API** | Personal access tokens with scopes |
| **Hardening** | CAPTCHA, HIBP (stretch) |

### v1.9 — Dashboards & polish
- Customizable project dashboards (burndown, velocity, CFD widgets)
- Enhanced For You page (what changed, what’s due)
- CSV export for issues and reports
- Watchers on issues
- Email notification hooks (issue events, not auth)

### v2.0 — Scale, collaboration & enterprise identity ⬜

**Auth spec (Part B):** [docs/v2.0-auth-enterprise-breadth-requirements.md](./docs/v2.0-auth-enterprise-breadth-requirements.md)

| Area | Deliverable |
|------|-------------|
| **SAML 2.0 SSO** | SP metadata, login, ACS; JIT users |
| **OIDC** | Per-org IdP; optional enforce SSO |
| **SCIM 2.0** | User/group provision + deprovision |
| **Org policy** | Require 2FA, email domain allowlist, invite-only |
| **Auth audit** | Admin `auth_events` API |

**Also v2.0 (product):**

- Project templates (Scrum, Kanban, blank)
- Guest/read-only external collaborators
- Granular REST CRUD per resource (replace full snapshot PUT where needed)

### v2.1 — Platform & passkeys (stretch)

- WebAuthn / passkey sign-in
- Rule builder (trigger → condition → action)
- Webhooks
- Integration stubs (GitHub PR linking)

### v2.x — AI (optional)
- NL → JQL assist
- Sprint summary / status update drafts
- Duplicate issue suggestions

---

## Non-goals (current)

- Full Jira Service Management (ITSM)
- Marketplace / 3000 integrations
- Data Center / on-prem clustering
- Billing, seat management, Atlassian Guard

---

*Last updated: June 2026 — auth §7 expanded for market breadth (v1.11) and enterprise (v2.0).*
