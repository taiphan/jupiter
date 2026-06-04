import { NextResponse } from 'next/server';
import { consumeAuthToken } from '@/server/auth/tokens';
import { markEmailVerified } from '@/server/auth/users';
import { getAppUrl } from '@/server/auth/config';
import { requireDb } from '@/server/api-helpers';

export async function GET(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(`${getAppUrl()}/login?error=invalid_token`);
  }

  const userId = await consumeAuthToken(token, 'verify_email');
  if (!userId) {
    return NextResponse.redirect(`${getAppUrl()}/login?error=invalid_token`);
  }

  await markEmailVerified(userId);
  return NextResponse.redirect(`${getAppUrl()}/login?verified=1`);
}
