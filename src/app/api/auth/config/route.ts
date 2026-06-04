import { json, requireDb } from '@/server/api-helpers';
import {
  isGoogleAuthEnabled,
  isGitHubAuthEnabled,
  isMicrosoftAuthEnabled,
  isTwoFactorEnabled,
} from '@/server/auth/config';
import { getAuthSettings } from '@/server/auth/auth-settings';

export async function GET() {
  const dbError = requireDb();
  if (dbError) {
    return json({
      emailAuth: false,
      googleAuth: false,
      microsoftAuth: false,
      githubAuth: false,
    });
  }

  const settings = await getAuthSettings();

  return json({
    emailAuth: true,
    googleAuth: await isGoogleAuthEnabled(),
    microsoftAuth: await isMicrosoftAuthEnabled(),
    githubAuth: await isGitHubAuthEnabled(),
    twoFactorAuth: await isTwoFactorEnabled(),
    emailProvider: settings.emailProvider,
    workspacePersistence: true,
  });
}
