import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/server/db/client';
import { verifyPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Username and password are required');

  const db = getDb()!;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, parsed.data.username))
    .limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return error('Invalid username or password', 401);
  }

  await createSession(user.id);

  const { passwordHash: _ph, ...safe } = user;
  void _ph;
  return json({ user: safe });
}
