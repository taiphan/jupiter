import { describe, expect, it } from 'vitest';
import { getProjectTemplate, templateDefaultsForCreate } from '../project-templates';

describe('project templates', () => {
  it('scrum template enables backlog on board', () => {
    const t = getProjectTemplate('scrum');
    expect(t.type).toBe('scrum');
    expect(t.statusOverrides?.backlog?.showOnBoard).toBe(true);
    expect(t.seedSprint).toBe(true);
  });

  it('kanban uses default board columns', () => {
    const defaults = templateDefaultsForCreate('kanban');
    expect(defaults.type).toBe('kanban');
    expect(defaults.statusOverrides).toBeUndefined();
  });
});
