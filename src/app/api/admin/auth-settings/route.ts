import { json, error, requireDb, requireUser, isResponse } from '@/server/api-helpers';
import {
  getAuthSettings,
  toPublicAuthSettings,
  updateAuthSettings,
} from '@/server/auth/auth-settings';
import { authSettingsUpdateSchema } from '@/server/auth/auth-settings-types';
import { sendTestAuthEmail, MailDeliveryError } from '@/server/auth/mailer';

async function requireAdmin() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.role !== 'admin') return error('Forbidden', 403);
  return user;
}

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  const settings = await getAuthSettings();
  return json(toPublicAuthSettings(settings));
}

export async function PUT(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  const parsed = authSettingsUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? 'Invalid settings', 400);
  }

  try {
    const publicSettings = await updateAuthSettings(parsed.data);
    return json(publicSettings);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Update failed', 500);
  }
}

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'test-email') {
    return error('Unknown action', 400);
  }

  try {
    await sendTestAuthEmail();
    return json({ ok: true, message: 'Test email sent.' });
  } catch (e) {
    if (e instanceof MailDeliveryError) {
      return error('Could not send test email. Check SMTP settings.', 503);
    }
    throw e;
  }
}
