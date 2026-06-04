import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  /** scrypt `salt:hash`; null for Google-only accounts */
  passwordHash: text('password_hash'),
  role: text('role').notNull().$type<'admin' | 'lead' | 'member' | 'viewer'>(),
  avatarColor: text('avatar_color').notNull().default('#0C66E4'),
  title: text('title').notNull().default(''),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  /** AES-256-GCM encrypted TOTP secret; set when 2FA is enabled */
  totpSecret: text('totp_secret'),
  /** Pending enrollment secret (encrypted) until user confirms with a code */
  totpPendingSecret: text('totp_pending_secret'),
  totpEnabledAt: timestamp('totp_enabled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const totpBackupCodes = pgTable(
  'totp_backup_codes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('totp_backup_codes_user_idx').on(t.userId)],
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull().$type<'verify_email' | 'password_reset'>(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId)],
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().$type<'google' | 'microsoft' | 'github'>(),
    providerAccountId: text('provider_account_id').notNull(),
    emailAtLink: text('email_at_link').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_provider_account').on(t.provider, t.providerAccountId)],
);

// ─── Workspace auth configuration (admin UI; secrets encrypted) ───────────

export const workspaceAuthConfig = pgTable('workspace_auth_config', {
  id: text('id').primaryKey(),
  appUrl: text('app_url').notNull().default('http://localhost:3100'),
  emailProvider: text('email_provider').notNull().$type<'console' | 'gmail' | 'smtp'>().default('console'),
  smtpHost: text('smtp_host').notNull().default('smtp.gmail.com'),
  smtpPort: integer('smtp_port').notNull().default(587),
  smtpSecure: boolean('smtp_secure').notNull().default(false),
  smtpUser: text('smtp_user').notNull().default(''),
  smtpPassEncrypted: text('smtp_pass_encrypted'),
  emailFrom: text('email_from').notNull().default('taiphantuan@gmail.com'),
  /** Redirect all auth emails to this inbox (dev/testing). Empty = send to real recipient. */
  mailRedirectTo: text('mail_redirect_to').notNull().default('taiphantuan@gmail.com'),
  testEmailTo: text('test_email_to').notNull().default('taiphantuan@gmail.com'),
  googleAuthEnabled: boolean('google_auth_enabled').notNull().default(true),
  googleClientId: text('google_client_id').notNull().default(''),
  googleClientSecretEncrypted: text('google_client_secret_encrypted'),
  googleAllowedHd: text('google_allowed_hd').notNull().default(''),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(true),
  microsoftAuthEnabled: boolean('microsoft_auth_enabled').notNull().default(true),
  microsoftClientId: text('microsoft_client_id').notNull().default(''),
  microsoftClientSecretEncrypted: text('microsoft_client_secret_encrypted'),
  microsoftTenantId: text('microsoft_tenant_id').notNull().default('common'),
  githubAuthEnabled: boolean('github_auth_enabled').notNull().default(true),
  githubClientId: text('github_client_id').notNull().default(''),
  githubClientSecretEncrypted: text('github_client_secret_encrypted'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Sessions ───────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    tokenHash: text('token_hash').notNull(),
    scopes: jsonb('scopes').notNull().$type<string[]>().default(['workspace:read']),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('api_tokens_user_idx').on(t.userId)],
);

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'kanban' | 'scrum'>(),
  leadId: text('lead_id').notNull().references(() => users.id),
  issueCounter: integer('issue_counter').notNull().default(0),
  statusOverrides: jsonb('status_overrides').$type<
    Partial<
      Record<
        string,
        { label?: string; color?: string; showOnBoard?: boolean; order?: number }
      >
    >
  >(),
  transitionRules: jsonb('transition_rules').$type<
    Record<string, Record<string, string[]>>
  >(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Project membership (many-to-many)
export const projectMembers = pgTable(
  'project_members',
  {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

// ─── Sprints ────────────────────────────────────────────────────────────────

export const sprints = pgTable('sprints', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  name: text('name').notNull(),
  goal: text('goal'),
  state: text('state').notNull().$type<'planned' | 'active' | 'completed'>(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ─── Custom field definitions ───────────────────────────────────────────────

export const customFields = pgTable('custom_fields', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().$type<'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url'>(),
  options: jsonb('options').$type<string[]>(),
  required: boolean('required').default(false),
  order: integer('order').notNull().default(0),
});

// ─── Issues ─────────────────────────────────────────────────────────────────

export const issues = pgTable(
  'issues',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type').notNull().$type<'epic' | 'story' | 'task' | 'bug' | 'subtask'>(),
    summary: text('summary').notNull(),
    description: text('description'),
    status: text('status').notNull().$type<'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done'>(),
    priority: text('priority').notNull().$type<'highest' | 'high' | 'medium' | 'low' | 'lowest'>(),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    reporterId: text('reporter_id').notNull().references(() => users.id),
    labels: jsonb('labels').$type<string[]>().notNull().default([]),
    parentId: text('parent_id'),
    sprintId: text('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
    storyPoints: integer('story_points'),
    /** Calendar day (YYYY-MM-DD) for list/calendar views */
    dueDate: text('due_date'),
    customFields: jsonb('custom_fields').$type<Record<string, string | number | boolean>>(),
    rank: doublePrecision('rank').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('issues_project_idx').on(t.projectId),
    index('issues_status_idx').on(t.status),
    index('issues_assignee_idx').on(t.assigneeId),
  ],
);

// ─── Comments ───────────────────────────────────────────────────────────────

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Activity log ───────────────────────────────────────────────────────────

export const activity = pgTable(
  'activity',
  {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull(),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_issue_idx').on(t.issueId)],
);

// ─── Attachments (metadata; blobs would live in object storage in prod) ──────

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  dataUrl: text('data_url').notNull(),
  uploadedById: text('uploaded_by_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Issue links ────────────────────────────────────────────────────────────
//
// Directed relationships between two distinct issues. Paired link types
// (e.g. `blocks` ↔ `is_blocked_by`) are persisted as a single canonical row
// and the inverse is derived on read; `relates_to` is symmetric. The
// `(type, from_issue_id, to_issue_id)` triple is unique so the same pair
// cannot carry the same link type twice. A CHECK constraint forbids
// self-links at the database level (Req 4.4); the application also enforces
// duplicate-pair (across both directions) and short-cycle rejection through
// the issue-links service / store.
//
// Runtime data lives in the Zustand `issue-links-store` for v1.1; this
// table is reserved for the v1.2 server migration so the schema is forward
// compatible (Req 9.1).

export const quickFilters = pgTable(
  'quick_filters',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    filters: jsonb('filters').notNull().$type<Record<string, unknown>>(),
    createdById: text('created_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quick_filters_project_idx').on(t.projectId)],
);

// ─── v1.8 persistence ───────────────────────────────────────────────────────

export const notificationReads = pgTable(
  'notification_reads',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activityId: text('activity_id')
      .notNull()
      .references(() => activity.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.activityId] }),
    index('notification_reads_user_idx').on(t.userId),
  ],
);

export const workspaceEvents = pgTable(
  'workspace_events',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull().references(() => users.id),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workspace_events_project_idx').on(t.projectId),
    index('workspace_events_created_idx').on(t.createdAt),
  ],
);

export const burndownSnapshots = pgTable(
  'burndown_snapshots',
  {
    id: text('id').primaryKey(),
    sprintId: text('sprint_id')
      .notNull()
      .references(() => sprints.id, { onDelete: 'cascade' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    remainingPoints: integer('remaining_points').notNull().default(0),
    scopePoints: integer('scope_points'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('burndown_snapshots_sprint_idx').on(t.sprintId, t.recordedAt)],
);

export const issueLinks = pgTable(
  'issue_links',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull().$type<
      | 'blocks'
      | 'is_blocked_by'
      | 'relates_to'
      | 'clones'
      | 'is_cloned_by'
      | 'duplicates'
      | 'is_duplicated_by'
    >(),
    fromIssueId: text('from_issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    toIssueId: text('to_issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: text('created_by').notNull().references(() => users.id),
  },
  (t) => [
    uniqueIndex('issue_links_unique_pair').on(t.type, t.fromIssueId, t.toIssueId),
    index('issue_links_from_idx').on(t.fromIssueId),
    index('issue_links_to_idx').on(t.toIssueId),
    check('issue_links_no_self', sql`${t.fromIssueId} <> ${t.toIssueId}`),
  ],
);

export type DbUser = typeof users.$inferSelect;
export type DbProject = typeof projects.$inferSelect;
export type DbIssue = typeof issues.$inferSelect;
export type DbSprint = typeof sprints.$inferSelect;
export type DbIssueLink = typeof issueLinks.$inferSelect;
