import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/server/auth/session';
import { json, error, requireDb, getDb } from '@/server/api-helpers';
import { schema } from '@/server/db/client';
import { totpEnableBodySchema } from '@/server/auth/schemas';
import { assertTwoFactorFeature } from '@/server/auth/totp-guard';
import { enableTotp } from '@/server/auth/totp';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST(request: Request) {
  if (!(await isTwoFactorEnabled())) return error('Not found', 404);

  const dbError = requireDb();
  if (dbError) return dbError;

  try {
    await assertTwoFactorFeature();
  } catch {
    return error('Not found', 404);
  }

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const parsed = totpEnableBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Enter a valid 6-digit code');

  const result = await enableTotp(user, parsed.data.code);
  if ('error' in result) return error(result.error, 400);

  const db = getDb()!;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  return json({ backupCodes: result.backupCodes, totpEnabled: Boolean(rows[0]?.totpEnabledAt) });
}
