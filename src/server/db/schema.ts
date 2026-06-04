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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
    provider: text('provider').notNull().$type<'google'>(),
    providerAccountId: text('provider_account_id').notNull(),
    emailAtLink: text('email_at_link').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_provider_account').on(t.provider, t.providerAccountId)],
);

// ─── Sessions ───────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'kanban' | 'scrum'>(),
  leadId: text('lead_id').notNull().references(() => users.id),
  issueCounter: integer('issue_counter').notNull().default(0),
  statusOverrides: jsonb('status_overrides'),
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
