import { isDbConfigured } from '@/server/db/client';
import { getAuthSettings } from './auth-settings';
import { defaultsFromEnv, type ResolvedAuthSettings } from './auth-settings-types';

export type LoginAuthConfig = {
  emailAuth: boolean;
  googleAuth: boolean;
  microsoftAuth: boolean;
  githubAuth: boolean;
  twoFactorAuth: boolean;
  workspacePersistence: boolean;
  emailProvider?: ResolvedAuthSettings['emailProvider'];
};

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

function configFromEnv(): LoginAuthConfig {
  const env = defaultsFromEnv();
  return {
    emailAuth: false,
    googleAuth: providerReady(env, 'google'),
    microsoftAuth: providerReady(env, 'microsoft'),
    githubAuth: providerReady(env, 'github'),
    twoFactorAuth: env.twoFactorEnabled,
    workspacePersistence: false,
    emailProvider: env.emailProvider,
  };
}

/** Public auth capabilities for login/sign-up UI (no secrets). */
export async function getLoginAuthConfig(): Promise<LoginAuthConfig> {
  if (!isDbConfigured()) {
    return configFromEnv();
  }

  const settings = await getAuthSettings();
  return {
    emailAuth: true,
    googleAuth: providerReady(settings, 'google'),
    microsoftAuth: providerReady(settings, 'microsoft'),
    githubAuth: providerReady(settings, 'github'),
    twoFactorAuth: settings.twoFactorEnabled,
    workspacePersistence: true,
    emailProvider: settings.emailProvider,
  };
}
