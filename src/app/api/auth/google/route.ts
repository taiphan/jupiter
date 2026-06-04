import { NextResponse } from 'next/server';
import { startGoogleSignIn } from '@/server/auth/google';
import { isGoogleAuthEnabled, getAppUrlAsync } from '@/server/auth/config';
import { error } from '@/server/api-helpers';

export async function GET(request: Request) {
  if (!(await isGoogleAuthEnabled())) {
    return error('Google sign-in is not enabled', 404);
  }
  try {
    const redirect = new URL(request.url).searchParams.get('redirect');
    const url = await startGoogleSignIn(request, redirect);
    return NextResponse.redirect(url);
  } catch (e) {
    if (e instanceof Error && e.message === 'rate_limited') {
      return NextResponse.redirect(`${await getAppUrlAsync()}/login?error=rate_limited`);
    }
    return error('Google sign-in failed to start', 500);
  }
}
