import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { json, requireDb } from '@/server/api-helpers';
import { toPublicUser } from '@/server/auth/user-mapper';
import { isGoogleAuthEnabled, isGitHubAuthEnabled, isMicrosoftAuthEnabled, isTwoFactorEnabled } from '@/server/auth/config';
import { userHas2faEnabled } from '@/server/auth/totp';
import { listOAuthProvidersForUser } from '@/server/auth/oauth/disconnect';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) {
    return json({
      user: null,
      oauthConnected: [],
      hasPassword: false,
      googleConnected: false,
      googleAuthAvailable: false,
      microsoftAuthAvailable: false,
      githubAuthAvailable: false,
      totpEnabled: false,
      twoFactorAuthAvailable: await isTwoFactorEnabled(),
    });
  }

  const oauthConnected = await listOAuthProvidersForUser(user.id);

  return json({
    user: toPublicUser(user),
    oauthConnected,
    hasPassword: Boolean(user.passwordHash),
    googleConnected: oauthConnected.includes('google'),
    googleAuthAvailable: await isGoogleAuthEnabled(),
    microsoftAuthAvailable: await isMicrosoftAuthEnabled(),
    githubAuthAvailable: await isGitHubAuthEnabled(),
    totpEnabled: userHas2faEnabled(user),
    twoFactorAuthAvailable: await isTwoFactorEnabled(),
  });
}
