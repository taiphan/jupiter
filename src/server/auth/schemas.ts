import { z } from 'zod';

export const emailSchema = z.string().email().max(255).transform((v) => v.trim().toLowerCase());

export const passwordSchema = z.string().min(8).max(128);

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120).trim(),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const resendVerificationBodySchema = z.object({
  email: emailSchema,
});

export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter a 6-digit code');

export const totpEnableBodySchema = z.object({
  code: totpCodeSchema,
});

export const totpChallengeBodySchema = z.object({
  code: totpCodeSchema.optional(),
  backupCode: z.string().min(8).max(32).optional(),
}).refine((d) => Boolean(d.code || d.backupCode), {
  message: 'Code or backup code is required',
});

export const totpDisableBodySchema = z.object({
  password: z.string().min(1).max(128),
  code: totpCodeSchema.optional(),
  backupCode: z.string().min(8).max(32).optional(),
}).refine((d) => Boolean(d.code || d.backupCode), {
  message: 'TOTP code or backup code is required',
});

export const totpRegenerateBodySchema = z.object({
  password: z.string().min(1).max(128),
  code: totpCodeSchema,
});
