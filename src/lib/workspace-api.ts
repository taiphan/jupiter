import type { WorkspaceSnapshot } from '@/lib/workspace-types';

export type WorkspaceApiMode = 'offline' | 'empty' | 'ok';

export async function fetchWorkspace(): Promise<
  | { mode: 'offline' }
  | { mode: 'empty' }
  | { mode: 'ok'; snapshot: WorkspaceSnapshot }
> {
  try {
    const res = await fetch('/api/workspace', { credentials: 'same-origin' });
    if (res.status === 503) return { mode: 'offline' };
    if (!res.ok) return { mode: 'offline' };
    const data = (await res.json()) as WorkspaceSnapshot & { empty?: boolean };
    if (data.empty) return { mode: 'empty' };
    return { mode: 'ok', snapshot: data };
  } catch {
    return { mode: 'offline' };
  }
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<boolean> {
  try {
    const res = await fetch('/api/workspace', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function seedWorkspaceOnServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/workspace/seed', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? 'Seed failed' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}
