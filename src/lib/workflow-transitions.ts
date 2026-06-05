import type { UserRole } from './auth-store';
import { STATUSES } from './types';
import type { IssueStatus, Project, TransitionRules } from './types';

const ALL_STATUSES: IssueStatus[] = [...STATUSES];

/** Default: admin/lead/member may transition anywhere; viewer may not. */
export function buildDefaultTransitionRules(): TransitionRules {
  const full = Object.fromEntries(
    STATUSES.map((from) => [from, ALL_STATUSES]),
  ) as TransitionRules['admin'];

  const none = Object.fromEntries(
    STATUSES.map((from) => [from, [] as IssueStatus[]]),
  ) as TransitionRules['viewer'];

  return {
    admin: full,
    lead: full,
    member: full,
    viewer: none,
  };
}

export const DEFAULT_TRANSITION_RULES = buildDefaultTransitionRules();

/** Merge project overrides with defaults per role and from-status. */
export function resolveTransitionRules(project?: Project | null): TransitionRules {
  const result = {} as TransitionRules;
  for (const role of ['admin', 'lead', 'member', 'viewer'] as UserRole[]) {
    const roleDefault = DEFAULT_TRANSITION_RULES[role]!;
    const overrides = project?.transitionRules?.[role];
    result[role] = Object.fromEntries(
      STATUSES.map((from) => [
        from,
        overrides?.[from] !== undefined
          ? [...overrides[from]!]
          : [...(roleDefault[from] ?? ALL_STATUSES)],
      ]),
    ) as TransitionRules[UserRole];
  }
  return result;
}

function rulesForRole(role: UserRole, project?: Project | null): TransitionRules[UserRole] {
  return resolveTransitionRules(project)[role]!;
}

/** Target statuses allowed from `from` for this role. */
export function getAllowedTargets(
  role: UserRole,
  from: IssueStatus,
  project?: Project | null,
): IssueStatus[] {
  const roleRules = rulesForRole(role, project);
  return roleRules?.[from] ?? ALL_STATUSES;
}

export function canTransition(
  role: UserRole | undefined,
  from: IssueStatus,
  to: IssueStatus,
  project?: Project | null,
): boolean {
  if (!role) return false;
  if (from === to) return true;
  return getAllowedTargets(role, from, project).includes(to);
}
