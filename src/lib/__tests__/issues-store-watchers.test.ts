import { describe, expect, it, beforeEach } from 'vitest';
import { useIssuesStore } from '../issues-store';
import { useProjectsStore } from '../projects-store';
import type { Issue } from '../types';

const REPORTER = 'usr_lead';
const ASSIGNEE = 'usr_member';
const OTHER = 'usr_viewer';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss_1',
    key: 'WEB-99',
    projectId: 'prj_web',
    type: 'task',
    summary: 'Watcher test',
    status: 'todo',
    priority: 'medium',
    reporterId: REPORTER,
    assigneeId: ASSIGNEE,
    labels: [],
    watcherIds: [REPORTER, ASSIGNEE],
    rank: 1000,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('issues store watchers', () => {
  beforeEach(() => {
    useIssuesStore.setState({
      issues: [makeIssue()],
      comments: [],
      activity: [],
      attachments: [],
    });
  });

  it('toggleWatch adds and removes the current user', () => {
    const store = useIssuesStore.getState();
    store.toggleWatch('iss_1', OTHER);
    expect(useIssuesStore.getState().issues[0].watcherIds).toContain(OTHER);

    store.toggleWatch('iss_1', OTHER);
    expect(useIssuesStore.getState().issues[0].watcherIds).not.toContain(OTHER);
  });

  it('addWatcher deduplicates and logs watcher activity', () => {
    useIssuesStore.getState().addWatcher('iss_1', OTHER, REPORTER);
    const issue = useIssuesStore.getState().issues[0];
    expect(issue.watcherIds.filter((id) => id === OTHER)).toHaveLength(1);

    const watcherActivity = useIssuesStore
      .getState()
      .activity.filter((a) => a.issueId === 'iss_1' && a.kind === 'watcher');
    expect(watcherActivity).toHaveLength(1);
  });

  it('auto-adds assignee to watchers on assignee change', () => {
    useIssuesStore.getState().updateIssue('iss_1', { assigneeId: OTHER }, REPORTER);
    expect(useIssuesStore.getState().issues[0].watcherIds).toContain(OTHER);
  });

  it('createIssue seeds reporter and assignee as watchers', () => {
    useProjectsStore.setState({
      projects: [
        {
          id: 'prj_web',
          key: 'WEB',
          name: 'Web',
          type: 'kanban',
          leadId: REPORTER,
          memberIds: [REPORTER, ASSIGNEE],
          createdAt: '2026-01-01T00:00:00.000Z',
          issueCounter: 99,
        },
      ],
      members: [],
    });
    useIssuesStore.setState({ issues: [], comments: [], activity: [], attachments: [] });

    const issue = useIssuesStore.getState().createIssue({
      projectId: 'prj_web',
      type: 'task',
      summary: 'New issue',
      reporterId: REPORTER,
      assigneeId: ASSIGNEE,
    });

    expect(issue.watcherIds).toEqual([REPORTER, ASSIGNEE]);
  });
});
