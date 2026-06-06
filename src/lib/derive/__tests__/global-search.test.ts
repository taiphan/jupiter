import { describe, expect, it } from 'vitest';
import { runGlobalSearch } from '../global-search';
import type { Issue, Member, Project } from '../../types';

const members: Member[] = [
  { id: 'u1', name: 'Alex Lead', username: 'alex', email: 'alex@x.com', avatarColor: '#000' },
];

const projects: Project[] = [
  {
    id: 'p1', key: 'WEB', name: 'Website', type: 'scrum', leadId: 'u1',
    memberIds: ['u1'], createdAt: '', issueCounter: 1,
  },
];

const issues: Issue[] = [
  {
    id: 'i1', key: 'WEB-1', projectId: 'p1', type: 'bug', summary: 'Login error',
    description: 'OAuth redirect fails', status: 'todo', priority: 'high',
    reporterId: 'u1', assigneeId: 'u1', labels: ['auth'], fixVersionIds: [],
    watcherIds: [], rank: 1, createdAt: '', updatedAt: '',
  },
  {
    id: 'i2', key: 'WEB-2', projectId: 'p1', type: 'task', summary: 'Docs update',
    status: 'done', priority: 'low', reporterId: 'u1', labels: [],
    fixVersionIds: [], watcherIds: [], rank: 2, createdAt: '', updatedAt: '',
  },
];

describe('runGlobalSearch', () => {
  it('matches issue by label and description', () => {
    const r = runGlobalSearch('oauth', { issues, projects, members });
    expect(r.issues.map((i) => i.key)).toEqual(['WEB-1']);
    expect(r.totalIssueMatches).toBe(1);
  });

  it('matches project by key', () => {
    const r = runGlobalSearch('web', { issues, projects, members });
    expect(r.projects).toHaveLength(1);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('matches member by name', () => {
    const r = runGlobalSearch('alex', { issues, projects, members });
    expect(r.members).toHaveLength(1);
  });

  it('collects matching labels', () => {
    const r = runGlobalSearch('auth', { issues, projects, members });
    expect(r.labels).toContain('auth');
  });
});
