import { describe, expect, it } from 'vitest';
import { parseJql, runJql } from '../jql';
import type { Issue } from '../types';
import type { JqlContext } from '../jql';

const ctx: JqlContext = {
  currentUserId: 'usr_me',
  resolveUser: (t) => (t.toLowerCase() === 'me' ? 'usr_me' : undefined),
  resolveProject: (t) => (t === 'WEB' ? 'prj_web' : undefined),
  resolveSprint: () => undefined,
  resolveVersion: (t) => (t === '1.1.0' ? 'ver_1' : t === '1.0.0' ? 'ver_0' : undefined),
};

const issues: Issue[] = [
  {
    id: '1',
    key: 'WEB-1',
    projectId: 'prj_web',
    type: 'bug',
    summary: 'Login fails',
    status: 'todo',
    priority: 'high',
    reporterId: 'usr_admin',
    labels: ['auth'],
    fixVersionIds: ['ver_1'],
    watcherIds: ['usr_me'],
    rank: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '2',
    key: 'WEB-2',
    projectId: 'prj_web',
    type: 'task',
    summary: 'Docs',
    status: 'done',
    priority: 'low',
    reporterId: 'usr_admin',
    labels: [],
    fixVersionIds: [],
    watcherIds: ['usr_other'],
    rank: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('parseJql NOT', () => {
  it('parses NOT clause', () => {
    const q = parseJql('NOT status = done');
    expect(q.where).toEqual({ kind: 'not', child: { kind: 'clause', field: 'status', op: '=', values: ['done'] } });
  });
});

describe('runJql', () => {
  it('filters with NOT', () => {
    const result = runJql(issues, parseJql('NOT status = done'), ctx);
    expect(result.map((i) => i.key)).toEqual(['WEB-1']);
  });

  it('filters fixVersion by name', () => {
    const result = runJql(issues, parseJql('fixVersion = "1.1.0"'), ctx);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('WEB-1');
  });

  it('filters watcher = currentUser()', () => {
    const result = runJql(issues, parseJql('watcher = currentUser()'), ctx);
    expect(result.map((i) => i.key)).toEqual(['WEB-1']);
  });

  it('combines NOT with AND', () => {
    const result = runJql(
      issues,
      parseJql('type = bug AND NOT status = done'),
      ctx,
    );
    expect(result.map((i) => i.key)).toEqual(['WEB-1']);
  });
});
