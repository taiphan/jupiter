import { createPasswordUser, findUserByEmail } from '@/server/auth/users';
import { issueAuthToken } from '@/server/auth/tokens';
import { sendAuthEmail, MailDeliveryError } from '@/server/auth/mailer';
import { json, error, requireDb } from '@/server/api-helpers';
import { registerBodySchema } from '@/server/auth/schemas';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const ip = clientIp(request);
  const limit = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return error('Too many attempts. Try again later.', 429);
  }

  const parsed = registerBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? 'Invalid registration data');
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return error('An account with this email already exists', 409);
  }

  const user = await createPasswordUser({
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.name,
  });

  const token = await issueAuthToken(user.id, 'verify_email');
  try {
    await sendAuthEmail(user.email, 'verify_email', token);
  } catch (e) {
    if (e instanceof MailDeliveryError) {
      return error('Could not send verification email. Try again later.', 503);
    }
    throw e;
  }

  return json(
    { message: 'Check your email to verify your account before signing in.' },
    { status: 201 },
  );
}
