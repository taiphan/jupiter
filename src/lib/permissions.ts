import type { UserRole } from './auth-store';

export type Permission =
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'issues.view'
  | 'issues.create'
  | 'issues.edit'
  | 'issues.delete'
  | 'issues.transition'
  | 'comments.create'
  | 'comments.delete'
  | 'people.view'
  | 'people.manage'
  | 'settings.view'
  | 'settings.edit';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'issues.view', 'issues.create', 'issues.edit', 'issues.delete', 'issues.transition',
    'comments.create', 'comments.delete',
    'people.view', 'people.manage',
    'settings.view', 'settings.edit',
  ],
  lead: [
    'projects.view', 'projects.create', 'projects.edit',
    'issues.view', 'issues.create', 'issues.edit', 'issues.delete', 'issues.transition',
    'comments.create', 'comments.delete',
    'people.view', 'people.manage',
    'settings.view',
  ],
  member: [
    'projects.view',
    'issues.view', 'issues.create', 'issues.edit', 'issues.transition',
    'comments.create',
    'people.view',
    'settings.view',
  ],
  viewer: [
    'projects.view',
    'issues.view',
    'people.view',
    'settings.view',
  ],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Routes that require a specific permission. Routes not listed here are
 * accessible to all authenticated users.
 *
 * Dynamic segments are matched by prefix (e.g. `/projects/PROJ` matches `/projects`).
 */
const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: '/projects', permission: 'projects.view' },
  { prefix: '/issues', permission: 'issues.view' },
  { prefix: '/people', permission: 'people.view' },
  { prefix: '/settings', permission: 'settings.view' },
];

export function canAccessRoute(role: UserRole | undefined, route: string): boolean {
  const match = ROUTE_PERMISSIONS.find((r) => route === r.prefix || route.startsWith(`${r.prefix}/`));
  if (!match) return true;
  return hasPermission(role, match.permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  lead: 'Project Lead',
  member: 'Team Member',
  viewer: 'Viewer',
};
