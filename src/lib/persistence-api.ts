import type { Notification } from './use-notifications';
import type { AuditPage } from './audit-types';

export async function fetchNotificationsFromApi(): Promise<
  | { mode: 'offline' }
  | { mode: 'ok'; notifications: Notification[]; unreadCount: number }
> {
  try {
    const res = await fetch('/api/notifications', { credentials: 'same-origin' });
    if (res.status === 503) return { mode: 'offline' };
    if (!res.ok) return { mode: 'offline' };
    const data = (await res.json()) as {
      notifications: Notification[];
      unreadCount: number;
    };
    return { mode: 'ok', notifications: data.notifications, unreadCount: data.unreadCount };
  } catch {
    return { mode: 'offline' };
  }
}

export async function markNotificationsReadApi(activityIds: string[]): Promise<boolean> {
  if (activityIds.length === 0) return true;
  try {
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAuditPage(params: {
  cursor?: string | null;
  limit?: number;
  projectId?: string;
  actorId?: string;
  kind?: string;
  search?: string;
}): Promise<{ mode: 'offline' } | { mode: 'ok'; page: AuditPage }> {
  try {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.projectId) qs.set('projectId', params.projectId);
    if (params.actorId) qs.set('actorId', params.actorId);
    if (params.kind) qs.set('kind', params.kind);
    if (params.search) qs.set('search', params.search);

    const res = await fetch(`/api/audit?${qs.toString()}`, { credentials: 'same-origin' });
    if (res.status === 503) return { mode: 'offline' };
    if (!res.ok) return { mode: 'offline' };
    const page = (await res.json()) as AuditPage;
    return { mode: 'ok', page };
  } catch {
    return { mode: 'offline' };
  }
}

export async function fetchBurndownSnapshots(
  sprintId: string,
): Promise<{ mode: 'offline' } | { mode: 'ok'; snapshots: { date: string; remaining: number }[] }> {
  try {
    const res = await fetch(`/api/sprints/${encodeURIComponent(sprintId)}/burndown`, {
      credentials: 'same-origin',
    });
    if (res.status === 503) return { mode: 'offline' };
    if (!res.ok) return { mode: 'offline' };
    const data = (await res.json()) as {
      snapshots: { date: string; remaining: number }[];
    };
    return { mode: 'ok', snapshots: data.snapshots };
  } catch {
    return { mode: 'offline' };
  }
}

export async function appendBurndownSnapshotApi(
  sprintId: string,
  remainingPoints: number,
  scopePoints?: number,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/sprints/${encodeURIComponent(sprintId)}/burndown`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remainingPoints, scopePoints }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function recordWorkspaceEventApi(input: {
  projectId?: string;
  kind: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch('/api/workspace/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // fire-and-forget
  }
}
