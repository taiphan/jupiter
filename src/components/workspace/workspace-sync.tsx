'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  consumeSkipNextWorkspaceSync,
  isWorkspaceHydrating,
  isWorkspaceOnline,
  markSkipNextWorkspaceSync,
  setPersistenceReady,
  setWorkspaceHydrating,
  setWorkspaceOnline,
} from '@/lib/workspace-mode';
import {
  fetchWorkspace,
  saveWorkspace,
  seedWorkspaceOnServer,
} from '@/lib/workspace-api';
import {
  applyWorkspaceSnapshot,
  collectWorkspaceSnapshot,
} from '@/lib/workspace-snapshot';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssueLinksStore } from '@/lib/issue-links-store';
import { useCustomFieldsStore } from '@/lib/custom-fields-store';
import { useQuickFiltersStore } from '@/lib/quick-filters-store';
import { useVersionsStore } from '@/lib/versions-store';
import { useAutomationStore } from '@/lib/automation-store';

const SAVE_DEBOUNCE_MS = 800;

/**
 * Loads workspace from Postgres when the API is up; debounces PUT sync on store changes.
 */
export function WorkspaceSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.emailVerified) {
      setWorkspaceOnline(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setWorkspaceHydrating(true);
      const result = await fetchWorkspace();
      if (cancelled) return;

      if (result.mode === 'offline') {
        setWorkspaceOnline(false);
        setWorkspaceHydrating(false);
        setPersistenceReady(false);
        return;
      }

      setWorkspaceOnline(true);

      if (result.mode === 'empty') {
        const seeded = await seedWorkspaceOnServer();
        if (cancelled) return;
        if (seeded.ok) {
          const again = await fetchWorkspace();
          if (!cancelled && again.mode === 'ok') {
            markSkipNextWorkspaceSync();
            applyWorkspaceSnapshot(again.snapshot);
          }
        }
      } else if (result.mode === 'ok') {
        markSkipNextWorkspaceSync();
        applyWorkspaceSnapshot(result.snapshot);
      }

      setWorkspaceHydrating(false);
      setPersistenceReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.emailVerified, user?.id]);

  useEffect(() => {
    if (!isWorkspaceOnline() || !isAuthenticated) return;

    const scheduleSave = () => {
      if (isWorkspaceHydrating() || consumeSkipNextWorkspaceSync()) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveWorkspace(collectWorkspaceSnapshot());
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubs = [
      useProjectsStore.subscribe(scheduleSave),
      useIssuesStore.subscribe(scheduleSave),
      useSprintsStore.subscribe(scheduleSave),
      useIssueLinksStore.subscribe(scheduleSave),
      useCustomFieldsStore.subscribe(scheduleSave),
      useQuickFiltersStore.subscribe(scheduleSave),
      useVersionsStore.subscribe(scheduleSave),
      useAutomationStore.subscribe(scheduleSave),
    ];

    return () => {
      unsubs.forEach((u) => u());
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isAuthenticated]);

  return null;
}
