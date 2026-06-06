import type { WorkspaceSnapshot } from '@/lib/workspace-types';
import { SEED_CUSTOM_FIELDS } from '@/lib/custom-fields-store';
import { SEED_VERSIONS } from '@/lib/versions-store';
import { SEED_AUTOMATION_RULES } from '@/lib/automation-store';
import {
  SEED_MEMBERS,
  SEED_PROJECTS,
  SEED_ISSUES,
  SEED_COMMENTS,
  SEED_ACTIVITY,
  SEED_SPRINTS,
} from '@/lib/seed';

/** Demo workspace aligned with client seed modules. */
export function buildSeedWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    members: SEED_MEMBERS,
    projects: SEED_PROJECTS,
    issues: SEED_ISSUES,
    comments: SEED_COMMENTS,
    activity: SEED_ACTIVITY,
    sprints: SEED_SPRINTS,
    attachments: [],
    issueLinks: [],
    customFields: SEED_CUSTOM_FIELDS,
    quickFilters: [],
    versions: SEED_VERSIONS,
    automationRules: SEED_AUTOMATION_RULES,
    projectWebhooks: [],
  };
}
