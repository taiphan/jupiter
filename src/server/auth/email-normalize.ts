export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function usernameFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] ?? 'user';
  const safe = local.replace(/[^a-z0-9_]/gi, '_').slice(0, 32);
  return safe.length > 0 ? safe : 'user';
}
