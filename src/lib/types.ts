import { z } from 'zod';

// ─── Issue type ─────────────────────────────────────────────────────────────

export const ISSUE_TYPES = ['epic', 'story', 'task', 'bug', 'subtask'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
  subtask: 'Subtask',
};

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  epic: '#8b5cf6', // violet
  story: '#10b981', // emerald
  task: '#3b82f6', // blue
  bug: '#ef4444', // red
  subtask: '#64748b', // slate
};

// ─── Priority ───────────────────────────────────────────────────────────────

export const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  highest: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-blue-600 dark:text-blue-400',
  lowest: 'text-slate-500 dark:text-slate-400',
};

// ─── Status (workflow) ──────────────────────────────────────────────────────

export const STATUSES = ['backlog', 'todo', 'in-progress', 'in-review', 'done'] as const;
export type IssueStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  done: 'Done',
};

export const STATUS_COLORS: Record<IssueStatus, string> = {
  backlog: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'in-review': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
};

/** Columns shown on the Kanban board (excludes Backlog) — used as the workflow default. */
export const BOARD_STATUSES: IssueStatus[] = ['todo', 'in-progress', 'in-review', 'done'];

/** Default status meta — used when no project-level override is set. */
export const STATUS_DEFAULTS: Record<IssueStatus, { label: string; color: string; showOnBoard: boolean; order: number }> = {
  backlog: { label: STATUS_LABELS.backlog, color: '#94A3B8', showOnBoard: false, order: 0 },
  todo: { label: STATUS_LABELS.todo, color: '#64748B', showOnBoard: true, order: 1 },
  'in-progress': { label: STATUS_LABELS['in-progress'], color: '#0C66E4', showOnBoard: true, order: 2 },
  'in-review': { label: STATUS_LABELS['in-review'], color: '#F59E0B', showOnBoard: true, order: 3 },
  done: { label: STATUS_LABELS.done, color: '#1F845A', showOnBoard: true, order: 4 },
};

// ─── Project ────────────────────────────────────────────────────────────────

export const PROJECT_TYPES = ['kanban', 'scrum'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const projectSchema = z.object({
  id: z.string(),
  key: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]+$/, 'Key must be uppercase letters/digits, starting with a letter'),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(PROJECT_TYPES),
  leadId: z.string(),
  memberIds: z.array(z.string()),
  createdAt: z.string(),
  /** Counter used to generate the next issue key (e.g. PROJ-7) */
  issueCounter: z.number().int().nonnegative(),
  /** Per-project workflow overrides (label, color, board visibility, order) keyed by status */
  statusOverrides: z
    .partialRecord(
      z.enum(STATUSES),
      z.object({
        label: z.string().optional(),
        color: z.string().optional(),
        showOnBoard: z.boolean().optional(),
        order: z.number().optional(),
      }),
    )
    .optional(),
});

export type Project = z.infer<typeof projectSchema>;

// ─── Custom fields ──────────────────────────────────────────────────────────

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'select', 'date', 'checkbox', 'url'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Dropdown',
  date: 'Date',
  checkbox: 'Checkbox',
  url: 'URL',
};

export interface CustomFieldDef {
  id: string;
  projectId: string;
  name: string;
  type: CustomFieldType;
  /** Options for select-type fields */
  options?: string[];
  required?: boolean;
  /** Display order within the issue panel */
  order: number;
}

/** Stored value can be string | number | boolean depending on field type. */
export type CustomFieldValue = string | number | boolean | undefined;

// ─── Attachments ────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  issueId: string;
  name: string;
  /** MIME type */
  mime: string;
  /** Size in bytes */
  size: number;
  /** Data URL (base64). Kept small via an upload size cap. */
  dataUrl: string;
  uploadedById: string;
  createdAt: string;
}

// ─── Issue ──────────────────────────────────────────────────────────────────

export const issueSchema = z.object({
  id: z.string(),
  /** Human key like PROJ-1 */
  key: z.string(),
  projectId: z.string(),
  type: z.enum(ISSUE_TYPES),
  summary: z.string().min(1, 'Summary is required'),
  description: z.string().optional(),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  assigneeId: z.string().optional(),
  reporterId: z.string(),
  labels: z.array(z.string()).default([]),
  /** Parent issue id (for epic→story or story→subtask) */
  parentId: z.string().optional(),
  /** Sprint this issue is committed to */
  sprintId: z.string().optional(),
  storyPoints: z.number().int().nonnegative().optional(),
  /** Values for project-defined custom fields, keyed by field id */
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  /** Position within its column for stable ordering on the board */
  rank: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Issue = z.infer<typeof issueSchema>;

// ─── Comment ────────────────────────────────────────────────────────────────

export const commentSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  authorId: z.string(),
  body: z.string().min(1),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

// ─── Activity log ───────────────────────────────────────────────────────────

export type ActivityKind =
  | 'created'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'type'
  | 'summary'
  | 'description'
  | 'label'
  | 'parent'
  | 'comment';

export interface ActivityEntry {
  id: string;
  issueId: string;
  actorId: string;
  kind: ActivityKind;
  /** Free-form summary, e.g. "Status: To Do → In Progress" */
  message: string;
  createdAt: string;
}

export type Member = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarColor: string;
  title?: string;
};

// ─── Sprint ─────────────────────────────────────────────────────────────────

export const SPRINT_STATES = ['planned', 'active', 'completed'] as const;
export type SprintState = (typeof SPRINT_STATES)[number];

export const SPRINT_STATE_LABELS: Record<SprintState, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
};

export interface Sprint {
  id: string;
  projectId: string;
  /** Sequential index per project, used in default names */
  number: number;
  name: string;
  goal?: string;
  state: SprintState;
  startDate?: string;
  endDate?: string;
  /** Set when the sprint is completed */
  completedAt?: string;
}
