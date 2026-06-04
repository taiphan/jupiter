/** User-safe messages for OAuth query errors on /login. */
export function googleAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    google_auth_failed: 'Google sign-in was cancelled or failed. Try again.',
    google_disabled: 'Google sign-in is not enabled on this server.',
    invalid_state: 'Sign-in session expired. Please try again.',
    token_exchange_failed: 'Could not complete Google sign-in. Try again.',
    userinfo_failed: 'Could not read your Google profile. Try again.',
    email_not_verified: 'Your Google email is not verified.',
    domain_not_allowed: 'This Google account is not allowed for this workspace.',
    rate_limited: 'Too many sign-in attempts. Wait a few minutes.',
    no_db: 'Server database is not available.',
  };
  return map[code] ?? 'Google sign-in failed. Try email and password instead.';
}
