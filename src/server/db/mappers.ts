import type {
  Project,
  Issue,
  Comment,
  ActivityEntry,
  Attachment,
  Sprint,
  IssueLink,
  CustomFieldDef,
  Member,
} from '@/lib/types';
import type { QuickFilter } from '@/lib/quick-filters-store';
import type {
  DbProject,
  DbIssue,
  DbSprint,
  DbIssueLink,
} from './schema';
import * as schema from './schema';

function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString();
}

function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapUserToMember(row: typeof schema.users.$inferSelect): Member {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatarColor: row.avatarColor,
    title: row.title || undefined,
  };
}

export function mapProjectRow(
  row: DbProject,
  memberIds: string[],
): Project {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    leadId: row.leadId,
    memberIds,
    createdAt: row.createdAt.toISOString(),
    issueCounter: row.issueCounter,
    statusOverrides: row.statusOverrides ?? undefined,
    transitionRules: row.transitionRules as Project['transitionRules'],
  };
}

export function projectToInsert(p: Project) {
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description ?? null,
    type: p.type,
    leadId: p.leadId,
    issueCounter: p.issueCounter,
    statusOverrides: p.statusOverrides ?? null,
    transitionRules: p.transitionRules ?? null,
    createdAt: parseDate(p.createdAt) ?? new Date(),
  };
}

export function mapIssueRow(row: DbIssue): Issue {
  return {
    id: row.id,
    key: row.key,
    projectId: row.projectId,
    type: row.type,
    summary: row.summary,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assigneeId ?? undefined,
    reporterId: row.reporterId,
    labels: (row.labels as string[]) ?? [],
    parentId: row.parentId ?? undefined,
    sprintId: row.sprintId ?? undefined,
    storyPoints: row.storyPoints ?? undefined,
    dueDate: row.dueDate ?? undefined,
    customFields: row.customFields ?? undefined,
    watcherIds: (row.watcherIds as string[]) ?? [],
    rank: row.rank,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function issueToInsert(i: Issue) {
  return {
    id: i.id,
    key: i.key,
    projectId: i.projectId,
    type: i.type,
    summary: i.summary,
    description: i.description ?? null,
    status: i.status,
    priority: i.priority,
    assigneeId: i.assigneeId ?? null,
    reporterId: i.reporterId,
    labels: i.labels,
    parentId: i.parentId ?? null,
    sprintId: i.sprintId ?? null,
    storyPoints: i.storyPoints ?? null,
    dueDate: i.dueDate ?? null,
    customFields: i.customFields ?? null,
    watcherIds: i.watcherIds ?? [],
    rank: i.rank,
    createdAt: parseDate(i.createdAt) ?? new Date(),
    updatedAt: parseDate(i.updatedAt) ?? new Date(),
  };
}

export function mapSprintRow(row: DbSprint): Sprint {
  return {
    id: row.id,
    projectId: row.projectId,
    number: row.number,
    name: row.name,
    goal: row.goal ?? undefined,
    state: row.state,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    completedAt: toIso(row.completedAt),
  };
}

export function sprintToInsert(s: Sprint) {
  return {
    id: s.id,
    projectId: s.projectId,
    number: s.number,
    name: s.name,
    goal: s.goal ?? null,
    state: s.state,
    startDate: parseDate(s.startDate),
    endDate: parseDate(s.endDate),
    completedAt: parseDate(s.completedAt),
  };
}

export function mapCommentRow(row: typeof schema.comments.$inferSelect): Comment {
  return {
    id: row.id,
    issueId: row.issueId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapActivityRow(row: typeof schema.activity.$inferSelect): ActivityEntry {
  return {
    id: row.id,
    issueId: row.issueId,
    actorId: row.actorId,
    kind: row.kind as ActivityEntry['kind'],
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAttachmentRow(row: typeof schema.attachments.$inferSelect): Attachment {
  return {
    id: row.id,
    issueId: row.issueId,
    name: row.name,
    mime: row.mime,
    size: row.size,
    dataUrl: row.dataUrl,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapCustomFieldRow(row: typeof schema.customFields.$inferSelect): CustomFieldDef {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type,
    options: (row.options as string[] | null) ?? undefined,
    required: row.required ?? undefined,
    order: row.order,
  };
}

export function mapIssueLinkRow(row: DbIssueLink): IssueLink {
  return {
    id: row.id,
    type: row.type,
    fromIssueId: row.fromIssueId,
    toIssueId: row.toIssueId,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export function mapQuickFilterRow(row: typeof schema.quickFilters.$inferSelect): QuickFilter {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    filters: row.filters as QuickFilter['filters'],
    createdById: row.createdById,
  };
}
