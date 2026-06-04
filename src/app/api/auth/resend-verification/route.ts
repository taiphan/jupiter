import { findUserByEmail } from '@/server/auth/users';
import { issueAuthToken } from '@/server/auth/tokens';
import { sendAuthEmail, MailDeliveryError } from '@/server/auth/mailer';
import { json, error, requireDb } from '@/server/api-helpers';
import { resendVerificationBodySchema } from '@/server/auth/schemas';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const ip = clientIp(request);
  const limit = checkRateLimit(`resend:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return error('Too many requests. Try again later.', 429);
  }

  const parsed = resendVerificationBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Email is required');

  const user = await findUserByEmail(parsed.data.email);
  if (user && !user.emailVerifiedAt) {
    const token = await issueAuthToken(user.id, 'verify_email');
    try {
      await sendAuthEmail(user.email, 'verify_email', token);
    } catch (e) {
      if (e instanceof MailDeliveryError) {
        return error('Could not send verification email. Try again later.', 503);
      }
      throw e;
    }
  }

  return json({ message: 'If an unverified account exists, we sent a new link.' });
}
