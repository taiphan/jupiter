import { json, requireDb } from '@/server/api-helpers';
import { isGoogleAuthEnabled } from '@/server/auth/config';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return json({ emailAuth: false, googleAuth: false });

  return json({
    emailAuth: true,
    googleAuth: isGoogleAuthEnabled(),
  });
}
