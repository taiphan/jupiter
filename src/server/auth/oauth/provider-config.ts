import { getAuthSettings } from '../auth-settings';
import type { OAuthProviderId } from './types';

export type ProviderOAuthConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string | null;
  microsoftTenantId?: string;
};

export async function getProviderOAuthConfig(
  provider: OAuthProviderId,
): Promise<ProviderOAuthConfig> {
  const s = await getAuthSettings();
  switch (provider) {
    case 'google':
      return {
        enabled: s.googleAuthEnabled,
        clientId: s.googleClientId,
        clientSecret: s.googleClientSecret,
      };
    case 'microsoft':
      return {
        enabled: s.microsoftAuthEnabled,
        clientId: s.microsoftClientId,
        clientSecret: s.microsoftClientSecret,
        microsoftTenantId: s.microsoftTenantId,
      };
    case 'github':
      return {
        enabled: s.githubAuthEnabled,
        clientId: s.githubClientId,
        clientSecret: s.githubClientSecret,
      };
  }
}

export async function assertProviderEnabled(provider: OAuthProviderId): Promise<ProviderOAuthConfig> {
  const cfg = await getProviderOAuthConfig(provider);
  if (!cfg.enabled || !cfg.clientId || !cfg.clientSecret) {
    throw new Error(`${provider}_disabled`);
  }
  return cfg;
}
