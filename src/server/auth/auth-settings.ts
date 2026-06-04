import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import { encryptAtRest, decryptAtRest } from './crypto';
import { resetMailerCache } from './mailer';
import { DEFAULT_TEST_EMAIL } from '@/lib/auth-config-constants';
import type {
  AuthSettingsPublic,
  AuthSettingsUpdate,
  ResolvedAuthSettings,
} from './auth-settings-types';
import { defaultsFromEnv } from './auth-settings-types';

const ROW_ID = 'default';

let cache: ResolvedAuthSettings | null = null;

export function invalidateAuthSettingsCache(): void {
  cache = null;
  resetMailerCache();
}

function rowToResolved(row: typeof schema.workspaceAuthConfig.$inferSelect): ResolvedAuthSettings {
  return {
    appUrl: row.appUrl,
    emailProvider: row.emailProvider,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser,
    smtpPass: row.smtpPassEncrypted ? decryptAtRest(row.smtpPassEncrypted) : null,
    emailFrom: row.emailFrom,
    mailRedirectTo: row.mailRedirectTo.trim() || null,
    testEmailTo: row.testEmailTo,
    googleAuthEnabled: row.googleAuthEnabled,
    googleClientId: row.googleClientId,
    googleClientSecret: row.googleClientSecretEncrypted
      ? decryptAtRest(row.googleClientSecretEncrypted)
      : null,
    googleAllowedHd: row.googleAllowedHd.trim() || null,
    twoFactorEnabled: row.twoFactorEnabled,
    microsoftAuthEnabled: row.microsoftAuthEnabled,
    microsoftClientId: row.microsoftClientId,
    microsoftClientSecret: row.microsoftClientSecretEncrypted
      ? decryptAtRest(row.microsoftClientSecretEncrypted)
      : null,
    microsoftTenantId: row.microsoftTenantId.trim() || 'common',
    githubAuthEnabled: row.githubAuthEnabled,
    githubClientId: row.githubClientId,
    githubClientSecret: row.githubClientSecretEncrypted
      ? decryptAtRest(row.githubClientSecretEncrypted)
      : null,
  };
}

function mergeEnvFallback(row: ResolvedAuthSettings): ResolvedAuthSettings {
  const env = defaultsFromEnv();
  return {
    ...row,
    smtpPass: row.smtpPass ?? env.smtpPass,
    googleClientSecret: row.googleClientSecret ?? env.googleClientSecret,
    googleClientId: row.googleClientId || env.googleClientId,
    microsoftClientSecret: row.microsoftClientSecret ?? env.microsoftClientSecret,
    microsoftClientId: row.microsoftClientId || env.microsoftClientId,
    githubClientSecret: row.githubClientSecret ?? env.githubClientSecret,
    githubClientId: row.githubClientId || env.githubClientId,
    smtpUser: row.smtpUser || env.smtpUser,
    emailFrom: row.emailFrom || env.emailFrom,
  };
}

export async function ensureAuthSettingsRow(): Promise<void> {
  const db = getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(schema.workspaceAuthConfig)
    .where(eq(schema.workspaceAuthConfig.id, ROW_ID))
    .limit(1);

  if (existing[0]) return;

  const env = defaultsFromEnv();
  await db.insert(schema.workspaceAuthConfig).values({
    id: ROW_ID,
    appUrl: env.appUrl,
    emailProvider: env.emailProvider,
    smtpHost: env.smtpHost,
    smtpPort: env.smtpPort,
    smtpSecure: env.smtpSecure,
    smtpUser: env.smtpUser || DEFAULT_TEST_EMAIL,
    smtpPassEncrypted: env.smtpPass ? encryptAtRest(env.smtpPass) : null,
    emailFrom: env.emailFrom,
    mailRedirectTo: env.mailRedirectTo ?? DEFAULT_TEST_EMAIL,
    testEmailTo: env.testEmailTo,
    googleAuthEnabled: env.googleAuthEnabled,
    googleClientId: env.googleClientId,
    googleClientSecretEncrypted: env.googleClientSecret
      ? encryptAtRest(env.googleClientSecret)
      : null,
    googleAllowedHd: env.googleAllowedHd ?? '',
    twoFactorEnabled: env.twoFactorEnabled,
    microsoftAuthEnabled: env.microsoftAuthEnabled,
    microsoftClientId: env.microsoftClientId,
    microsoftClientSecretEncrypted: env.microsoftClientSecret
      ? encryptAtRest(env.microsoftClientSecret)
      : null,
    microsoftTenantId: env.microsoftTenantId,
    githubAuthEnabled: env.githubAuthEnabled,
    githubClientId: env.githubClientId,
    githubClientSecretEncrypted: env.githubClientSecret
      ? encryptAtRest(env.githubClientSecret)
      : null,
  });
}

export async function getAuthSettings(): Promise<ResolvedAuthSettings> {
  if (cache) return cache;

  const db = getDb();
  if (!db) {
    cache = defaultsFromEnv();
    return cache;
  }

  await ensureAuthSettingsRow();
  const rows = await db
    .select()
    .from(schema.workspaceAuthConfig)
    .where(eq(schema.workspaceAuthConfig.id, ROW_ID))
    .limit(1);

  const row = rows[0];
  if (!row) {
    cache = defaultsFromEnv();
    return cache;
  }

  cache = mergeEnvFallback(rowToResolved(row));
  return cache;
}

export function toPublicAuthSettings(resolved: ResolvedAuthSettings): AuthSettingsPublic {
  return {
    appUrl: resolved.appUrl,
    emailProvider: resolved.emailProvider,
    smtpHost: resolved.smtpHost,
    smtpPort: resolved.smtpPort,
    smtpSecure: resolved.smtpSecure,
    smtpUser: resolved.smtpUser,
    emailFrom: resolved.emailFrom,
    mailRedirectTo: resolved.mailRedirectTo ?? '',
    testEmailTo: resolved.testEmailTo,
    googleAuthEnabled: resolved.googleAuthEnabled,
    googleClientId: resolved.googleClientId,
    googleAllowedHd: resolved.googleAllowedHd ?? '',
    twoFactorEnabled: resolved.twoFactorEnabled,
    microsoftAuthEnabled: resolved.microsoftAuthEnabled,
    microsoftClientId: resolved.microsoftClientId,
    microsoftTenantId: resolved.microsoftTenantId,
    githubAuthEnabled: resolved.githubAuthEnabled,
    githubClientId: resolved.githubClientId,
    hasSmtpPassword: Boolean(resolved.smtpPass),
    hasGoogleClientSecret: Boolean(resolved.googleClientSecret),
    hasMicrosoftClientSecret: Boolean(resolved.microsoftClientSecret),
    hasGithubClientSecret: Boolean(resolved.githubClientSecret),
  };
}

export async function updateAuthSettings(
  patch: AuthSettingsUpdate,
): Promise<AuthSettingsPublic> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  await ensureAuthSettingsRow();
  const current = await getAuthSettings();

  let smtpPassEncrypted: string | null | undefined;
  if (patch.clearSmtpPass) {
    smtpPassEncrypted = null;
  } else if (patch.smtpPass?.trim()) {
    smtpPassEncrypted = encryptAtRest(patch.smtpPass.replace(/\s/g, ''));
  }

  let googleClientSecretEncrypted: string | null | undefined;
  if (patch.clearGoogleClientSecret) {
    googleClientSecretEncrypted = null;
  } else if (patch.googleClientSecret?.trim()) {
    googleClientSecretEncrypted = encryptAtRest(patch.googleClientSecret.trim());
  }

  const set: Partial<typeof schema.workspaceAuthConfig.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.appUrl !== undefined) set.appUrl = patch.appUrl;
  if (patch.emailProvider !== undefined) set.emailProvider = patch.emailProvider;
  if (patch.smtpHost !== undefined) set.smtpHost = patch.smtpHost;
  if (patch.smtpPort !== undefined) set.smtpPort = patch.smtpPort;
  if (patch.smtpSecure !== undefined) set.smtpSecure = patch.smtpSecure;
  if (patch.smtpUser !== undefined) set.smtpUser = patch.smtpUser;
  if (smtpPassEncrypted !== undefined) set.smtpPassEncrypted = smtpPassEncrypted;
  if (patch.emailFrom !== undefined) set.emailFrom = patch.emailFrom;
  if (patch.mailRedirectTo !== undefined) set.mailRedirectTo = patch.mailRedirectTo;
  if (patch.testEmailTo !== undefined) set.testEmailTo = patch.testEmailTo;
  if (patch.googleAuthEnabled !== undefined) set.googleAuthEnabled = patch.googleAuthEnabled;
  if (patch.googleClientId !== undefined) set.googleClientId = patch.googleClientId;
  if (googleClientSecretEncrypted !== undefined) {
    set.googleClientSecretEncrypted = googleClientSecretEncrypted;
  }
  if (patch.googleAllowedHd !== undefined) set.googleAllowedHd = patch.googleAllowedHd;
  if (patch.twoFactorEnabled !== undefined) set.twoFactorEnabled = patch.twoFactorEnabled;

  let microsoftClientSecretEncrypted: string | null | undefined;
  if (patch.clearMicrosoftClientSecret) {
    microsoftClientSecretEncrypted = null;
  } else if (patch.microsoftClientSecret?.trim()) {
    microsoftClientSecretEncrypted = encryptAtRest(patch.microsoftClientSecret.trim());
  }

  let githubClientSecretEncrypted: string | null | undefined;
  if (patch.clearGithubClientSecret) {
    githubClientSecretEncrypted = null;
  } else if (patch.githubClientSecret?.trim()) {
    githubClientSecretEncrypted = encryptAtRest(patch.githubClientSecret.trim());
  }

  if (patch.microsoftAuthEnabled !== undefined) {
    set.microsoftAuthEnabled = patch.microsoftAuthEnabled;
  }
  if (patch.microsoftClientId !== undefined) set.microsoftClientId = patch.microsoftClientId;
  if (microsoftClientSecretEncrypted !== undefined) {
    set.microsoftClientSecretEncrypted = microsoftClientSecretEncrypted;
  }
  if (patch.microsoftTenantId !== undefined) set.microsoftTenantId = patch.microsoftTenantId;
  if (patch.githubAuthEnabled !== undefined) set.githubAuthEnabled = patch.githubAuthEnabled;
  if (patch.githubClientId !== undefined) set.githubClientId = patch.githubClientId;
  if (githubClientSecretEncrypted !== undefined) {
    set.githubClientSecretEncrypted = githubClientSecretEncrypted;
  }

  if (patch.emailProvider === 'gmail' && patch.smtpHost === undefined && !current.smtpHost) {
    set.smtpHost = 'smtp.gmail.com';
    set.smtpPort = 587;
  }

  await db
    .update(schema.workspaceAuthConfig)
    .set(set)
    .where(eq(schema.workspaceAuthConfig.id, ROW_ID));

  invalidateAuthSettingsCache();
  const next = await getAuthSettings();
  return toPublicAuthSettings(next);
}
