/** User-safe messages for OAuth query errors on /login. */
export function oauthAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    google_auth_failed: 'Google sign-in was cancelled or failed. Try again.',
    google_disabled: 'Google sign-in is not enabled on this server.',
    microsoft_auth_failed: 'Microsoft sign-in was cancelled or failed. Try again.',
    microsoft_disabled: 'Microsoft sign-in is not enabled on this server.',
    github_auth_failed: 'GitHub sign-in was cancelled or failed. Try again.',
    github_disabled: 'GitHub sign-in is not enabled on this server.',
    invalid_state: 'Sign-in session expired. Please try again.',
    token_exchange_failed: 'Could not complete sign-in. Try again.',
    userinfo_failed: 'Could not read your profile. Try again.',
    email_not_verified: 'Your email is not verified with the provider.',
    domain_not_allowed: 'This account is not allowed for this workspace.',
    rate_limited: 'Too many sign-in attempts. Wait a few minutes.',
    no_db: 'Server database is not available.',
  };
  return map[code] ?? null;
}

/** @deprecated use oauthAuthErrorMessage */
export function googleAuthErrorMessage(code: string | null): string | null {
  return oauthAuthErrorMessage(code) ?? (code ? 'Sign-in failed. Try email and password instead.' : null);
}
