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
| Watchers | — | ⬜ | |
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
| Burndown | Sprint + project reports | ✅ | Accessible chart variants |
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

| Capability | Jupiter | Status | Notes |
|------------|---------|--------|-------|
| **Email + password sign-in** | `/api/auth/login` | ✅ | Email is primary identifier |
| Email verification on sign-up | `/api/auth/register`, `/verify` | ✅ | Console/SMTP mailer |
| Password reset via email | `/forgot-password`, `/reset-password` | ✅ | Single-use tokens |
| Server-side sessions (cookies) | `/api/auth/me`, `/logout` | ✅ | HTTP-only `jupiter_session` |
| **Google Sign-In (OAuth 2.0)** | `/api/auth/google` | ✅ | PKCE; enable via env |
| Postgres users & sessions | Drizzle + Docker | ✅ | `npm run db:setup` |
| Rate limiting on auth | In-memory per IP | ✅ | Login, register, reset |
| SSO / SAML (enterprise) | — | ⬜ | Post v1.7 |
| Microsoft / Apple social login | — | ⬜ | Post v1.7 |
| MFA | — | — | Out of scope |

**Specs:** [v1.6 email auth](./docs/v1.6-auth-requirements.md) · [v1.7 Google Sign-In](./docs/v1.7-google-sign-in-requirements.md)  
**Tasks:** [v1.6](./tasks/v1.6-auth-todo.md) · [v1.7 Google](./tasks/v1.7-google-sign-in-todo.md)

**v1.6 target:** standard **email authorization** — register, verify email, sign in with email + password, reset password; demo seed uses `*@acme.dev` addresses in Docker.

---

## 8. Configure & administer

| Jira capability | Jupiter | Status | Notes |
|-----------------|---------|--------|-------|
| Roles & permissions | admin / lead / member / viewer | ✅ | Route + action guards |
| Project settings | Settings tab | ✅ | Name, key, lead, members |
| Workflow editor (visual) | Status columns via board config | 🟡 | Column mapping only; no transition rules UI |
| Audit log | `/audit` | ✅ | Admin/viewer access |
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
| Webhooks / REST API | Auth API + Drizzle scaffold | 🟡 | Session API today; issue CRUD API v1.7+ |

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

### v1.8 — Dashboards & polish
- Customizable project dashboards (burndown, velocity, CFD widgets)
- Enhanced For You page (what changed, what’s due)
- CSV export for issues and reports
- Watchers on issues

### v1.9 — Scale & collaboration
- Project templates (Scrum, Kanban, blank)
- Guest/read-only external collaborators
- Email notification hooks (issue events, not auth)
- Full REST API for issues/projects/sprints
- Workspace domain lock for Google (`hd` claim) — optional

### v2.0 — Automations & platform
- Rule builder (trigger → condition → action)
- Webhooks
- Integration stubs (GitHub PR linking)
- Postgres-backed issue sync (multi-user workspace data)

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

*Last updated: June 2026 — aligned with Atlassian Jira Spring 2026 seasonal release themes.*
