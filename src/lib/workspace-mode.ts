/** True when /api/workspace is available and hydrated. */
let workspaceOnline = false;
let hydrating = false;
let persistenceReady = false;
let skipNextSync = false;

const modeListeners = new Set<() => void>();

function notifyModeListeners(): void {
  modeListeners.forEach((l) => l());
}

export function subscribeWorkspaceMode(listener: () => void): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

export function getWorkspaceModeSnapshot(): { hydrating: boolean; online: boolean } {
  return { hydrating, online: workspaceOnline };
}

export function isWorkspaceOnline(): boolean {
  return workspaceOnline;
}

export function setWorkspaceOnline(value: boolean): void {
  workspaceOnline = value;
  if (!value) persistenceReady = false;
}

export function isPersistenceReady(): boolean {
  return persistenceReady && workspaceOnline;
}

export function setPersistenceReady(value: boolean): void {
  persistenceReady = value;
}

export function isWorkspaceHydrating(): boolean {
  return hydrating;
}

export function setWorkspaceHydrating(value: boolean): void {
  hydrating = value;
  notifyModeListeners();
}

/** Suppress one debounced save after loading from server. */
export function consumeSkipNextWorkspaceSync(): boolean {
  if (!skipNextSync) return false;
  skipNextSync = false;
  return true;
}

export function markSkipNextWorkspaceSync(): void {
  skipNextSync = true;
}
