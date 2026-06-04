import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { hashPassword } from '@/server/auth/password';
import { getDb, schema } from '@/server/db/client';
import { json, error, requireDb } from '@/server/api-helpers';

const bodySchema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  if (user.passwordHash) {
    return error('Password already set. Use change password or reset flow.', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return error('Password must be 8–128 characters', 400);

  const db = getDb();
  if (!db) return error('Database not configured', 503);

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, user.id));

  return json({ ok: true });
}
