import { describe, expect, it } from 'vitest';
import { defaultsFromEnv, type ResolvedAuthSettings } from '../auth-settings-types';
import { providerOperational } from '../login-config';

describe('login OAuth availability', () => {
  const baseSettings = (): ResolvedAuthSettings => ({
    ...defaultsFromEnv(),
    googleAuthEnabled: true,
    microsoftAuthEnabled: true,
    githubAuthEnabled: true,
    twoFactorEnabled: true,
  });

  it('UI can show Google when enabled even before secrets are set', () => {
    const settings = baseSettings();
    settings.googleClientId = '';
    settings.googleClientSecret = null;
    expect(settings.googleAuthEnabled).toBe(true);
    expect(providerOperational(settings, 'google')).toBe(false);
  });

  it('operational when id and secret are present', () => {
    const settings = baseSettings();
    settings.googleClientId = 'id';
    settings.googleClientSecret = 'secret';
    expect(providerOperational(settings, 'google')).toBe(true);
  });
});
