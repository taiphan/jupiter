import { isWorkspaceOnline } from './workspace-mode';
import { recordWorkspaceEventApi } from './persistence-api';

/** Fire-and-forget workspace audit event when Postgres persistence is online. */
export function recordWorkspaceEvent(input: {
  projectId?: string;
  kind: string;
  message: string;
  metadata?: Record<string, unknown>;
}): void {
  if (!isWorkspaceOnline()) return;
  void recordWorkspaceEventApi(input);
}
