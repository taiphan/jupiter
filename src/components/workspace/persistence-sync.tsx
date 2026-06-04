'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { isPersistenceReady } from '@/lib/workspace-mode';
import { fetchNotificationsFromApi } from '@/lib/persistence-api';
import { useNotificationsStore } from '@/lib/notifications-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useProjectsStore } from '@/lib/projects-store';
import { fetchBurndownSnapshots } from '@/lib/persistence-api';

/**
 * Loads v1.8 persistence APIs after workspace hydrate (notifications, burndown).
 */
export function PersistenceSync() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const projects = useProjectsStore((s) => s.projects);
  const setApiFeed = useNotificationsStore((s) => s.setApiFeed);
  const clearApiFeed = useNotificationsStore((s) => s.clearApiFeed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setReady(isPersistenceReady());
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.emailVerified || !ready) {
      if (user) clearApiFeed(user.id);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await fetchNotificationsFromApi();
      if (cancelled || result.mode !== 'ok') return;
      setApiFeed(user.id, result.notifications, result.unreadCount);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.emailVerified, ready, setApiFeed, clearApiFeed]);

  useEffect(() => {
    if (!isAuthenticated || !ready) return;

    let cancelled = false;
    void (async () => {
      const merged: Record<string, { date: string; remaining: number }[]> = {};
      for (const project of projects) {
        const sprints = useSprintsStore
          .getState()
          .getSprintsByProject(project.id)
          .filter((s) => s.state === 'completed');
        for (const sprint of sprints) {
          const res = await fetchBurndownSnapshots(sprint.id);
          if (res.mode === 'ok' && res.snapshots.length > 0) {
            merged[sprint.id] = res.snapshots;
          }
        }
      }
      if (!cancelled && Object.keys(merged).length > 0) {
        useSprintsStore.setState((s) => ({
          burndownSnapshots: { ...s.burndownSnapshots, ...merged },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready, projects]);

  return null;
}
