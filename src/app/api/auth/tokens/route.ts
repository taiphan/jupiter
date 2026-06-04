import { z } from 'zod';
import { getCurrentUser } from '@/server/auth/session';
import { createApiTokenForUser, listApiTokensForUser } from '@/server/auth/api-tokens';
import { json, error, requireDb } from '@/server/api-helpers';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const tokens = await listApiTokensForUser(user.id);
  return json({ tokens });
}

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error('Invalid token name', 400);

  const result = await createApiTokenForUser(
    user.id,
    parsed.data.name,
    ['workspace:read'],
    parsed.data.expiresInDays,
  );
  if ('error' in result) return error(result.error, 400);

  return json({ token: result.token, secret: result.raw }, { status: 201 });
}
