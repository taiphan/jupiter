import { describe, expect, it } from 'vitest';
import type { AutomationRule, Issue } from '../types';
import { AUTOMATION_UNASSIGNED } from '../types';
import { matchingRules } from '../automation-runner';

const baseIssue = {
  id: 'iss_1',
  key: 'WEB-1',
  projectId: 'prj_web',
  type: 'bug',
  summary: 'Test',
  status: 'todo',
  priority: 'medium',
  reporterId: 'usr_admin',
  labels: [],
  fixVersionIds: [],
  watcherIds: [],
  rank: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies Issue;

const rules: AutomationRule[] = [
  {
    id: 'r1',
    projectId: 'prj_web',
    name: 'On create',
    enabled: true,
    trigger: { type: 'issue_created' },
    actions: [{ type: 'add_label', label: 'triage' }],
    order: 0,
  },
  {
    id: 'r2',
    projectId: 'prj_web',
    name: 'Todo to done',
    enabled: true,
    trigger: { type: 'status_changed', fromStatus: 'todo', toStatus: 'done' },
    actions: [{ type: 'add_comment', commentBody: 'Shipped' }],
    order: 1,
  },
  {
    id: 'r3',
    projectId: 'prj_web',
    name: 'Disabled',
    enabled: false,
    trigger: { type: 'issue_created' },
    actions: [],
    order: 2,
  },
  {
    id: 'r4',
    projectId: 'prj_web',
    name: 'Assign to lead',
    enabled: true,
    trigger: { type: 'assignee_changed', fromAssigneeId: AUTOMATION_UNASSIGNED, toAssigneeId: 'usr_lead' },
    actions: [{ type: 'set_priority', priority: 'high' }],
    order: 3,
  },
  {
    id: 'r5',
    projectId: 'prj_web',
    name: 'Triage label',
    enabled: true,
    trigger: { type: 'label_added', label: 'triage' },
    actions: [{ type: 'add_comment', commentBody: 'Triaged' }],
    order: 4,
  },
];

describe('matchingRules', () => {
  it('matches issue_created rules', () => {
    const matched = matchingRules(rules, {
      event: 'issue_created',
      issue: baseIssue,
      actorId: 'usr_admin',
    });
    expect(matched.map((r) => r.id)).toEqual(['r1']);
  });

  it('matches status_changed with from/to filters', () => {
    const before = { ...baseIssue, status: 'todo' as const };
    const after = { ...baseIssue, status: 'done' as const };
    const matched = matchingRules(rules, {
      event: 'status_changed',
      issue: after,
      before,
      actorId: 'usr_admin',
    });
    expect(matched.map((r) => r.id)).toEqual(['r2']);
  });

  it('skips status rule when from status differs', () => {
    const before = { ...baseIssue, status: 'in-progress' as const };
    const after = { ...baseIssue, status: 'done' as const };
    const matched = matchingRules(rules, {
      event: 'status_changed',
      issue: after,
      before,
      actorId: 'usr_admin',
    });
    expect(matched).toHaveLength(0);
  });

  it('matches assignee_changed from unassigned to member', () => {
    const before = { ...baseIssue, assigneeId: undefined };
    const after = { ...baseIssue, assigneeId: 'usr_lead' };
    const matched = matchingRules(rules, {
      event: 'assignee_changed',
      issue: after,
      before,
      actorId: 'usr_admin',
    });
    expect(matched.map((r) => r.id)).toEqual(['r4']);
  });

  it('matches label_added when specific label is added', () => {
    const before = { ...baseIssue, labels: [] };
    const after = { ...baseIssue, labels: ['triage'] };
    const matched = matchingRules(rules, {
      event: 'label_added',
      issue: after,
      before,
      actorId: 'usr_admin',
      addedLabels: ['triage'],
    });
    expect(matched.map((r) => r.id)).toEqual(['r5']);
  });

  it('skips label rule when a different label is added', () => {
    const before = { ...baseIssue, labels: [] };
    const after = { ...baseIssue, labels: ['bug'] };
    const matched = matchingRules(rules, {
      event: 'label_added',
      issue: after,
      before,
      actorId: 'usr_admin',
      addedLabels: ['bug'],
    });
    expect(matched).toHaveLength(0);
  });
});
