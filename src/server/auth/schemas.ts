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
