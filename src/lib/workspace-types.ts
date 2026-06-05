import type { Project, Issue, Comment, ActivityEntry, Attachment, Sprint, IssueLink, CustomFieldDef, ProjectVersion } from './types';
import type { Member } from './types';
import type { QuickFilter } from './quick-filters-store';

/** Payload exchanged with GET/PUT /api/workspace */
export type WorkspaceSnapshot = {
  projects: Project[];
  members: Member[];
  issues: Issue[];
  comments: Comment[];
  activity: ActivityEntry[];
  attachments: Attachment[];
  sprints: Sprint[];
  issueLinks: IssueLink[];
  customFields: CustomFieldDef[];
  quickFilters: QuickFilter[];
  versions: ProjectVersion[];
};
