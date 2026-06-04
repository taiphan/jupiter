/** Safe internal paths after OAuth (no open redirects). */
const ALLOWED_PREFIXES = ['/projects', '/issues', '/people', '/audit', '/settings'];

export function sanitizePostAuthRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  if (trimmed.length > 512) return '/';

  const pathOnly = trimmed.split('?')[0] ?? '/';
  if (pathOnly === '/') return '/';

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : '/';
}
