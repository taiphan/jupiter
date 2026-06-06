'use client';

import { useSyncExternalStore } from 'react';
import { useProjectsStore } from './projects-store';
import {
  getWorkspaceModeSnapshot,
  subscribeWorkspaceMode,
} from './workspace-mode';

/** True once client stores have rehydrated and workspace sync finished (or is offline). */
export function useWorkspaceReady(): boolean {
  const mode = useSyncExternalStore(
    subscribeWorkspaceMode,
    getWorkspaceModeSnapshot,
    () => ({ hydrating: true, online: false }),
  );

  const projectsHydrated = useSyncExternalStore(
    (onStoreChange) => useProjectsStore.persist.onFinishHydration(onStoreChange),
    () => useProjectsStore.persist.hasHydrated(),
    () => false,
  );

  return projectsHydrated && !mode.hydrating;
}
