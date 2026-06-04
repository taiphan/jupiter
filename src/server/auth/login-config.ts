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

/** Show on login/sign-up when the provider toggle is on (credentials may still be pending). */
function providerEnabledForUi(
  settings: ResolvedAuthSettings,
  provider: 'google' | 'microsoft' | 'github',
): boolean {
  switch (provider) {
    case 'google':
      return settings.googleAuthEnabled;
    case 'microsoft':
      return settings.microsoftAuthEnabled;
    case 'github':
      return settings.githubAuthEnabled;
  }
}

/** OAuth routes require client id + secret. */
export function providerOperational(
  settings: ResolvedAuthSettings,
  provider: 'google' | 'microsoft' | 'github',
): boolean {
  if (!providerEnabledForUi(settings, provider)) return false;
  switch (provider) {
    case 'google':
      return Boolean(settings.googleClientId && settings.googleClientSecret);
    case 'microsoft':
      return Boolean(settings.microsoftClientId && settings.microsoftClientSecret);
    case 'github':
      return Boolean(settings.githubClientId && settings.githubClientSecret);
  }
}

function configFromEnv(): LoginAuthConfig {
  const env = defaultsFromEnv();
  return {
    emailAuth: false,
    googleAuth: providerEnabledForUi(env, 'google'),
    microsoftAuth: providerEnabledForUi(env, 'microsoft'),
    githubAuth: providerEnabledForUi(env, 'github'),
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
    googleAuth: providerEnabledForUi(settings, 'google'),
    microsoftAuth: providerEnabledForUi(settings, 'microsoft'),
    githubAuth: providerEnabledForUi(settings, 'github'),
    twoFactorAuth: settings.twoFactorEnabled,
    workspacePersistence: true,
    emailProvider: settings.emailProvider,
  };
}
