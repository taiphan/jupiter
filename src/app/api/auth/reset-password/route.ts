import { consumeAuthToken } from '@/server/auth/tokens';
import { updatePassword, deleteUserSessions } from '@/server/auth/users';
import { json, error, requireDb } from '@/server/api-helpers';
import { resetPasswordBodySchema } from '@/server/auth/schemas';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const ip = clientIp(request);
  const limit = checkRateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return error('Too many attempts. Try again later.', 429);
  }

  const parsed = resetPasswordBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Invalid reset request');

  const userId = await consumeAuthToken(parsed.data.token, 'password_reset');
  if (!userId) return error('Invalid or expired reset link', 400);

  await updatePassword(userId, parsed.data.password);
  await deleteUserSessions(userId);

  return json({ message: 'Password updated. You can sign in now.' });
}
