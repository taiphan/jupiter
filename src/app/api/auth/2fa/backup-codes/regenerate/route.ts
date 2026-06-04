import { getCurrentUser } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';
import { totpRegenerateBodySchema } from '@/server/auth/schemas';
import { regenerateBackupCodes } from '@/server/auth/totp';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST(request: Request) {
  if (!(await isTwoFactorEnabled())) return error('Not found', 404);

  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const parsed = totpRegenerateBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Password and 6-digit code are required');

  const result = await regenerateBackupCodes(
    user,
    parsed.data.password,
    parsed.data.code,
  );
  if ('error' in result) return error(result.error, 400);

  return json({ backupCodes: result.backupCodes });
}
