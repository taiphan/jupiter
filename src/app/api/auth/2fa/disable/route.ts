import { getCurrentUser } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';
import { totpDisableBodySchema } from '@/server/auth/schemas';
import { disableTotp } from '@/server/auth/totp';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST(request: Request) {
  if (!(await isTwoFactorEnabled())) return error('Not found', 404);

  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const parsed = totpDisableBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? 'Invalid request');

  const result = await disableTotp(
    user,
    parsed.data.password,
    parsed.data.code ?? '',
    parsed.data.backupCode,
  );
  if (!result.ok) return error(result.error, 400);

  return json({ ok: true });
}
