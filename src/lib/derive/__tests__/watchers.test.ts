import { describe, expect, it } from 'vitest';
import {
  addWatcherIds,
  defaultWatchersForIssue,
  isWatching,
  removeWatcherId,
  shouldReceiveIssueNotification,
} from '../watchers';

describe('defaultWatchersForIssue', () => {
  it('includes reporter only when no assignee', () => {
    expect(defaultWatchersForIssue('usr_a')).toEqual(['usr_a']);
  });

  it('includes reporter and assignee', () => {
    expect(defaultWatchersForIssue('usr_a', 'usr_b').sort()).toEqual(['usr_a', 'usr_b']);
  });
});

describe('shouldReceiveIssueNotification', () => {
  const issue = {
    reporterId: 'usr_rep',
    assigneeId: 'usr_asn',
    watcherIds: ['usr_watch'],
  };

  it('notifies reporter, assignee, and watchers', () => {
    expect(shouldReceiveIssueNotification(issue, 'usr_rep')).toBe(true);
    expect(shouldReceiveIssueNotification(issue, 'usr_asn')).toBe(true);
    expect(shouldReceiveIssueNotification(issue, 'usr_watch')).toBe(true);
    expect(shouldReceiveIssueNotification(issue, 'usr_other')).toBe(false);
  });
});

describe('addWatcherIds / removeWatcherId / isWatching', () => {
  it('deduplicates when adding', () => {
    expect(addWatcherIds(['a'], 'b', 'a')).toEqual(['a', 'b']);
  });

  it('removes a watcher', () => {
    expect(removeWatcherId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('isWatching reflects membership', () => {
    expect(isWatching({ watcherIds: ['x'] }, 'x')).toBe(true);
    expect(isWatching({ watcherIds: ['x'] }, 'y')).toBe(false);
  });
});
