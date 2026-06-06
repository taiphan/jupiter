import type { Issue, WebhookEvent } from './types';
import { useWebhooksStore } from './webhooks-store';

export interface WebhookIssuePayload {
  id: string;
  key: string;
  projectId: string;
  type: Issue['type'];
  summary: string;
  status: Issue['status'];
  priority: Issue['priority'];
  assigneeId?: string;
  reporterId: string;
  labels: string[];
  updatedAt: string;
}

export interface WebhookDispatchPayload {
  event: WebhookEvent;
  timestamp: string;
  issue: WebhookIssuePayload;
  actorId: string;
  changes?: {
    status?: { from: Issue['status']; to: Issue['status'] };
  };
}

function toIssuePayload(issue: Issue): WebhookIssuePayload {
  return {
    id: issue.id,
    key: issue.key,
    projectId: issue.projectId,
    type: issue.type,
    summary: issue.summary,
    status: issue.status,
    priority: issue.priority,
    assigneeId: issue.assigneeId,
    reporterId: issue.reporterId,
    labels: issue.labels,
    updatedAt: issue.updatedAt,
  };
}

function matchesEvent(webhookEvents: WebhookEvent[], event: WebhookEvent): boolean {
  return webhookEvents.includes(event);
}

/** Fire enabled project webhooks (best-effort; does not block the UI). */
export function dispatchWebhooks(input: {
  event: WebhookEvent;
  issue: Issue;
  actorId: string;
  before?: Issue;
}): void {
  const hooks = useWebhooksStore
    .getState()
    .getWebhooksForProject(input.issue.projectId)
    .filter((w) => w.enabled && matchesEvent(w.events, input.event));

  if (hooks.length === 0) return;

  const payload: WebhookDispatchPayload = {
    event: input.event,
    timestamp: new Date().toISOString(),
    issue: toIssuePayload(input.issue),
    actorId: input.actorId,
    ...(input.event === 'issue_status_changed' && input.before?.status
      ? { changes: { status: { from: input.before.status, to: input.issue.status } } }
      : {}),
  };

  for (const hook of hooks) {
    void fetch('/api/webhooks/deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: hook.url,
        secret: hook.secret,
        payload,
      }),
    }).catch(() => {
      /* delivery failures are non-blocking */
    });
  }
}
