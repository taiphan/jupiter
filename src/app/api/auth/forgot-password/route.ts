import { findUserByEmail } from '@/server/auth/users';
import { issueAuthToken } from '@/server/auth/tokens';
import { sendAuthEmail } from '@/server/auth/mailer';
import { json, requireDb } from '@/server/api-helpers';
import { forgotPasswordBodySchema } from '@/server/auth/schemas';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const ip = clientIp(request);
  const limit = checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return json({ message: 'If an account exists, we sent instructions.' });
  }

  const parsed = forgotPasswordBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ message: 'If an account exists, we sent instructions.' });
  }

  const user = await findUserByEmail(parsed.data.email);
  if (user?.passwordHash) {
    const token = await issueAuthToken(user.id, 'password_reset');
    await sendAuthEmail(user.email, 'password_reset', token);
  }

  return json({ message: 'If an account exists, we sent instructions.' });
}
