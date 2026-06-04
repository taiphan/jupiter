import { NextResponse } from 'next/server';
import { completeMicrosoftCallback } from '@/server/auth/oauth/microsoft';
import { isMicrosoftAuthEnabled, getAppUrlAsync } from '@/server/auth/config';
import { oauthCallbackErrorParam } from '@/server/auth/oauth/callback-errors';

export async function GET(request: Request) {
  const appUrl = await getAppUrlAsync();
  if (!(await isMicrosoftAuthEnabled())) {
    return NextResponse.redirect(`${appUrl}/login?error=microsoft_disabled`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${appUrl}/login?error=microsoft_auth_failed`);
  }

  const result = await completeMicrosoftCallback(request, code, state);
  if (!result.ok) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${oauthCallbackErrorParam('microsoft', result.reason)}`,
    );
  }

  return NextResponse.redirect(`${appUrl}${result.redirectTo}`);
}
