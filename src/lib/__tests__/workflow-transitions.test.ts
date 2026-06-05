import { describe, expect, it } from 'vitest';
import { canTransition, getAllowedTargets, DEFAULT_TRANSITION_RULES } from '../workflow-transitions';

describe('canTransition', () => {
  it('allows admin to move todo → done', () => {
    expect(canTransition('admin', 'todo', 'done')).toBe(true);
  });

  it('blocks viewer from any status change', () => {
    expect(canTransition('viewer', 'todo', 'in-progress')).toBe(false);
  });

  it('allows same-status no-op', () => {
    expect(canTransition('viewer', 'todo', 'todo')).toBe(true);
  });

  it('uses project transitionRules when set', () => {
    const project = {
      transitionRules: {
        member: { todo: ['in-progress'] },
      },
    } as Parameters<typeof canTransition>[3];

    expect(canTransition('member', 'todo', 'in-progress', project)).toBe(true);
    expect(canTransition('member', 'todo', 'done', project)).toBe(false);
  });

  it('merges partial role rules with defaults for other from-statuses', () => {
    const project = {
      transitionRules: {
        member: { todo: ['in-progress'] },
      },
    } as Parameters<typeof canTransition>[3];

    expect(canTransition('member', 'backlog', 'done', project)).toBe(true);
    expect(getAllowedTargets('member', 'backlog', project)).toEqual(DEFAULT_TRANSITION_RULES.member!.backlog);
  });

  it('does not widen viewer restrictions when role overrides are partial', () => {
    const project = {
      transitionRules: {
        viewer: { todo: [] },
      },
    } as unknown as Parameters<typeof canTransition>[3];

    expect(canTransition('viewer', 'todo', 'in-progress', project)).toBe(false);
    expect(canTransition('viewer', 'backlog', 'todo', project)).toBe(false);
  });
});

describe('getAllowedTargets', () => {
  it('returns all statuses for admin by default', () => {
    expect(getAllowedTargets('admin', 'todo')).toEqual(DEFAULT_TRANSITION_RULES.admin!.todo);
  });

  it('returns empty for viewer from todo', () => {
    expect(getAllowedTargets('viewer', 'todo')).toEqual([]);
  });
});
