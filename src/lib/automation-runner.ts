import type { AutomationRule, Issue } from './types';
import { AUTOMATION_UNASSIGNED } from './types';
import { useAutomationStore } from './automation-store';
import { useIssuesStore } from './issues-store';

export const AUTOMATION_ACTOR_ID = '__automation__';

export type AutomationEvent =
  | 'issue_created'
  | 'status_changed'
  | 'assignee_changed'
  | 'priority_changed'
  | 'label_added';

export interface AutomationRunContext {
  event: AutomationEvent;
  issue: Issue;
  before?: Issue;
  actorId: string;
  /** Labels newly added on this update (for label_added triggers). */
  addedLabels?: string[];
}

let automationDepth = 0;

function assigneeId(issue: Issue | undefined): string | undefined {
  return issue?.assigneeId;
}

function matchesAssigneeFilter(filter: string | undefined, assignee: string | undefined): boolean {
  if (filter === undefined) return true;
  if (filter === AUTOMATION_UNASSIGNED) return !assignee;
  return assignee === filter;
}

function matchesTrigger(rule: AutomationRule, ctx: AutomationRunContext): boolean {
  const { trigger } = rule;

  if (trigger.type === 'issue_created') {
    if (ctx.event !== 'issue_created') return false;
    if (trigger.issueType && ctx.issue.type !== trigger.issueType) return false;
    return true;
  }

  if (trigger.type === 'status_changed') {
    if (ctx.event !== 'status_changed') return false;
    if (trigger.fromStatus && ctx.before?.status !== trigger.fromStatus) return false;
    if (trigger.toStatus && ctx.issue.status !== trigger.toStatus) return false;
    return true;
  }

  if (trigger.type === 'assignee_changed') {
    if (ctx.event !== 'assignee_changed') return false;
    if (!matchesAssigneeFilter(trigger.fromAssigneeId, assigneeId(ctx.before))) return false;
    if (!matchesAssigneeFilter(trigger.toAssigneeId, assigneeId(ctx.issue))) return false;
    return true;
  }

  if (trigger.type === 'priority_changed') {
    if (ctx.event !== 'priority_changed') return false;
    if (trigger.fromPriority && ctx.before?.priority !== trigger.fromPriority) return false;
    if (trigger.toPriority && ctx.issue.priority !== trigger.toPriority) return false;
    return true;
  }

  if (trigger.type === 'label_added') {
    if (ctx.event !== 'label_added') return false;
    const added = ctx.addedLabels ?? [];
    if (added.length === 0) return false;
    if (trigger.label) {
      const want = trigger.label.trim().toLowerCase();
      return added.includes(want);
    }
    return true;
  }

  return false;
}

function applyRule(rule: AutomationRule, issue: Issue, actorId: string): void {
  const { updateIssue, addComment } = useIssuesStore.getState();
  let patch: Partial<Issue> = {};
  let labels = issue.labels;

  for (const action of rule.actions) {
    switch (action.type) {
      case 'set_status':
        if (action.status) patch = { ...patch, status: action.status };
        break;
      case 'set_assignee':
        patch = {
          ...patch,
          assigneeId: action.assigneeId ? action.assigneeId : undefined,
        };
        break;
      case 'set_priority':
        if (action.priority) patch = { ...patch, priority: action.priority };
        break;
      case 'add_label': {
        const label = action.label?.trim().toLowerCase();
        if (label && !labels.includes(label)) {
          labels = [...labels, label];
          patch = { ...patch, labels };
        }
        break;
      }
      case 'remove_label': {
        const label = action.label?.trim().toLowerCase();
        if (label && labels.includes(label)) {
          labels = labels.filter((l) => l !== label);
          patch = { ...patch, labels };
        }
        break;
      }
      case 'add_comment':
        if (action.commentBody?.trim()) {
          addComment({
            issueId: issue.id,
            authorId: actorId,
            body: `[Automation · ${rule.name}] ${action.commentBody.trim()}`,
          });
        }
        break;
      default:
        break;
    }
  }

  if (Object.keys(patch).length > 0) {
    updateIssue(issue.id, patch, AUTOMATION_ACTOR_ID, { skipAutomation: true });
  }
}

/** Run enabled project rules for a matching event. */
export function runAutomations(ctx: AutomationRunContext): void {
  if (automationDepth >= 3) return;

  automationDepth += 1;
  try {
    const rules = useAutomationStore
      .getState()
      .getRulesForProject(ctx.issue.projectId)
      .filter((r) => r.enabled && matchesTrigger(r, ctx));

    for (const rule of rules) {
      const issue = useIssuesStore.getState().issues.find((i) => i.id === ctx.issue.id);
      if (!issue) break;
      applyRule(rule, issue, ctx.actorId);
    }
  } finally {
    automationDepth -= 1;
  }
}

/** Test helper — evaluate which rules would match without side effects. */
export function matchingRules(
  rules: AutomationRule[],
  ctx: AutomationRunContext,
): AutomationRule[] {
  return rules.filter((r) => r.enabled && matchesTrigger(r, ctx));
}
