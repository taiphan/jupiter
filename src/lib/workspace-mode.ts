/** True when /api/workspace is available and hydrated. */
let workspaceOnline = false;
let hydrating = false;
let persistenceReady = false;
let skipNextSync = false;

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
