import { describe, expect, it } from 'vitest';
import { defaultsFromEnv, type ResolvedAuthSettings } from '../auth-settings-types';

function providerReady(
  settings: ResolvedAuthSettings,
  provider: 'google' | 'microsoft' | 'github',
): boolean {
  switch (provider) {
    case 'google':
      return (
        settings.googleAuthEnabled &&
        Boolean(settings.googleClientId) &&
        Boolean(settings.googleClientSecret)
      );
    case 'microsoft':
      return (
        settings.microsoftAuthEnabled &&
        Boolean(settings.microsoftClientId) &&
        Boolean(settings.microsoftClientSecret)
      );
    case 'github':
      return (
        settings.githubAuthEnabled &&
        Boolean(settings.githubClientId) &&
        Boolean(settings.githubClientSecret)
      );
  }
}

/** Mirrors mergeEnvFallback enable rules used in auth-settings.ts */
function mergeLikeProduction(row: ResolvedAuthSettings): ResolvedAuthSettings {
  const env = defaultsFromEnv();
  const googleClientId = row.googleClientId || env.googleClientId;
  const googleClientSecret = row.googleClientSecret ?? env.googleClientSecret;
  return {
    ...row,
    googleClientId,
    googleClientSecret,
    googleAuthEnabled:
      row.googleAuthEnabled ||
      env.googleAuthEnabled ||
      Boolean(googleClientId && googleClientSecret),
  };
}

describe('login OAuth availability', () => {
  it('enables Google when DB flag is off but merged credentials exist', () => {
    const row: ResolvedAuthSettings = {
      ...defaultsFromEnv(),
      googleAuthEnabled: false,
      googleClientId: 'client-id',
      googleClientSecret: 'secret',
    };
    const merged = mergeLikeProduction(row);
    expect(providerReady(merged, 'google')).toBe(true);
  });

  it('stays disabled without client secret', () => {
    const row: ResolvedAuthSettings = {
      ...defaultsFromEnv(),
      googleAuthEnabled: true,
      googleClientId: 'client-id',
      googleClientSecret: null,
    };
    expect(providerReady(row, 'google')).toBe(false);
  });
});
