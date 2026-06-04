import { NextResponse } from 'next/server';
import { completeGoogleCallback } from '@/server/auth/google';
import { isGoogleAuthEnabled, getAppUrlAsync } from '@/server/auth/config';

export async function GET(request: Request) {
  const appUrl = await getAppUrlAsync();
  if (!(await isGoogleAuthEnabled())) {
    return NextResponse.redirect(`${appUrl}/login?error=google_disabled`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
  }

  const result = await completeGoogleCallback(request, code, state);
  if (!result.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=${result.reason}`);
  }

  return NextResponse.redirect(`${appUrl}${result.redirectTo}`);
}
