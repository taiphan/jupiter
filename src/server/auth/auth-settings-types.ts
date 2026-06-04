import { z } from 'zod';
import { DEFAULT_TEST_EMAIL } from '@/lib/auth-config-constants';

export const emailProviderSchema = z.enum(['console', 'gmail', 'smtp']);

export const authSettingsPublicSchema = z.object({
  appUrl: z.string().url().max(500),
  emailProvider: emailProviderSchema,
  smtpHost: z.string().max(255),
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().max(255),
  emailFrom: z.string().email().max(255),
  mailRedirectTo: z.string().max(255), // empty = deliver to real recipient
  testEmailTo: z.string().email().max(255),
  googleAuthEnabled: z.boolean(),
  googleClientId: z.string().max(500),
  googleAllowedHd: z.string().max(255),
  twoFactorEnabled: z.boolean(),
  microsoftAuthEnabled: z.boolean(),
  microsoftClientId: z.string().max(500),
  microsoftTenantId: z.string().max(255),
  githubAuthEnabled: z.boolean(),
  githubClientId: z.string().max(500),
  hasSmtpPassword: z.boolean(),
  hasGoogleClientSecret: z.boolean(),
  hasMicrosoftClientSecret: z.boolean(),
  hasGithubClientSecret: z.boolean(),
});

export type AuthSettingsPublic = z.infer<typeof authSettingsPublicSchema>;

export const authSettingsUpdateSchema = z.object({
  appUrl: z.string().url().max(500).optional(),
  emailProvider: emailProviderSchema.optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPass: z.string().max(128).optional(),
  clearSmtpPass: z.boolean().optional(),
  emailFrom: z.string().email().max(255).optional(),
  mailRedirectTo: z.string().max(255).optional(),
  testEmailTo: z.string().email().max(255).optional(),
  googleAuthEnabled: z.boolean().optional(),
  googleClientId: z.string().max(500).optional(),
  googleClientSecret: z.string().max(500).optional(),
  clearGoogleClientSecret: z.boolean().optional(),
  googleAllowedHd: z.string().max(255).optional(),
  twoFactorEnabled: z.boolean().optional(),
  microsoftAuthEnabled: z.boolean().optional(),
  microsoftClientId: z.string().max(500).optional(),
  microsoftClientSecret: z.string().max(500).optional(),
  clearMicrosoftClientSecret: z.boolean().optional(),
  microsoftTenantId: z.string().max(255).optional(),
  githubAuthEnabled: z.boolean().optional(),
  githubClientId: z.string().max(500).optional(),
  githubClientSecret: z.string().max(500).optional(),
  clearGithubClientSecret: z.boolean().optional(),
});

export type AuthSettingsUpdate = z.infer<typeof authSettingsUpdateSchema>;

export type ResolvedAuthSettings = {
  appUrl: string;
  emailProvider: 'console' | 'gmail' | 'smtp';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string | null;
  emailFrom: string;
  mailRedirectTo: string | null;
  testEmailTo: string;
  googleAuthEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string | null;
  googleAllowedHd: string | null;
  twoFactorEnabled: boolean;
  microsoftAuthEnabled: boolean;
  microsoftClientId: string;
  microsoftClientSecret: string | null;
  microsoftTenantId: string;
  githubAuthEnabled: boolean;
  githubClientId: string;
  githubClientSecret: string | null;
};

export function defaultsFromEnv(): ResolvedAuthSettings {
  const provider = (process.env.EMAIL_PROVIDER ?? 'console') as ResolvedAuthSettings['emailProvider'];
  return {
    appUrl: process.env.APP_URL ?? 'http://localhost:3100',
    emailProvider: provider === 'gmail' ? 'gmail' : provider === 'smtp' ? 'smtp' : 'console',
    smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER?.trim() ?? DEFAULT_TEST_EMAIL,
    smtpPass: process.env.SMTP_PASS?.replace(/\s/g, '') || null,
    emailFrom: process.env.EMAIL_FROM?.trim() || DEFAULT_TEST_EMAIL,
    mailRedirectTo: process.env.MAIL_REDIRECT_TO?.trim() || DEFAULT_TEST_EMAIL,
    testEmailTo: process.env.TEST_EMAIL_TO?.trim() || DEFAULT_TEST_EMAIL,
    googleAuthEnabled: process.env.AUTH_GOOGLE_ENABLED === 'true',
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
    googleAllowedHd: process.env.GOOGLE_ALLOWED_HD?.trim() || null,
    twoFactorEnabled: process.env.AUTH_2FA_ENABLED !== 'false',
    microsoftAuthEnabled: process.env.AUTH_MICROSOFT_ENABLED === 'true',
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID?.trim() ?? '',
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET?.trim() || null,
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID?.trim() || 'common',
    githubAuthEnabled: process.env.AUTH_GITHUB_ENABLED === 'true',
    githubClientId: process.env.GITHUB_CLIENT_ID?.trim() ?? '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET?.trim() || null,
  };
}
