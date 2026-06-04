import type { ActivityKind } from './types';

export type WorkspaceEventKind =
  | 'project.created'
  | 'project.updated'
  | 'sprint.started'
  | 'sprint.completed'
  | 'sprint.created';

export type AuditEntry =
  | {
      source: 'issue';
      id: string;
      issueId: string;
      actorId: string;
      kind: ActivityKind;
      message: string;
      createdAt: string;
      issueKey: string | null;
      issueSummary: string | null;
      projectId: string | null;
    }
  | {
      source: 'workspace';
      id: string;
      projectId: string | null;
      actorId: string;
      kind: WorkspaceEventKind | string;
      message: string;
      createdAt: string;
      metadata?: Record<string, unknown>;
    };

export type AuditPage = {
  entries: AuditEntry[];
  nextCursor: string | null;
  totalApprox?: number;
};
