import { NextResponse } from 'next/server';
import { startMicrosoftSignIn } from '@/server/auth/oauth/microsoft';
import { isMicrosoftAuthEnabled, getAppUrlAsync } from '@/server/auth/config';
import { error } from '@/server/api-helpers';

export async function GET(request: Request) {
  if (!(await isMicrosoftAuthEnabled())) {
    return error('Microsoft sign-in is not enabled', 404);
  }
  try {
    const redirect = new URL(request.url).searchParams.get('redirect');
    const url = await startMicrosoftSignIn(request, redirect);
    return NextResponse.redirect(url);
  } catch (e) {
    if (e instanceof Error && e.message === 'rate_limited') {
      return NextResponse.redirect(`${await getAppUrlAsync()}/login?error=rate_limited`);
    }
    if (e instanceof Error && e.message === 'microsoft_disabled') {
      return NextResponse.redirect(`${await getAppUrlAsync()}/login?error=microsoft_disabled`);
    }
    return error('Microsoft sign-in failed to start', 500);
  }
}
