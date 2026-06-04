import type { OAuthProviderId } from './types';

export function oauthCallbackErrorParam(provider: OAuthProviderId, reason: string): string {
  if (reason === 'rate_limited' || reason === 'invalid_state' || reason === 'no_db') {
    return reason;
  }
  return `${provider}_auth_failed`;
}
