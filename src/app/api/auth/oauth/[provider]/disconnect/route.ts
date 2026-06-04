import { z } from 'zod';
import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { disconnectOAuth } from '@/server/auth/oauth/disconnect';
import { json, error, requireDb } from '@/server/api-helpers';
import type { OAuthProviderId } from '@/server/auth/oauth/types';

const providerSchema = z.enum(['google', 'microsoft', 'github']);

export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  const { provider: raw } = await context.params;
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) return error('Invalid provider', 400);

  const provider = parsed.data as OAuthProviderId;
  const result = await disconnectOAuth(user.id, provider);
  if (!result.ok) return error(result.error, 400);

  return json({ ok: true });
}
