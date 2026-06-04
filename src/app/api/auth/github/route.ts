import { NextResponse } from 'next/server';
import { startGitHubSignIn } from '@/server/auth/oauth/github';
import { isGitHubAuthEnabled, getAppUrlAsync } from '@/server/auth/config';
import { error } from '@/server/api-helpers';

export async function GET(request: Request) {
  if (!(await isGitHubAuthEnabled())) {
    return error('GitHub sign-in is not enabled', 404);
  }
  try {
    const redirect = new URL(request.url).searchParams.get('redirect');
    const url = await startGitHubSignIn(request, redirect);
    return NextResponse.redirect(url);
  } catch (e) {
    if (e instanceof Error && e.message === 'rate_limited') {
      return NextResponse.redirect(`${await getAppUrlAsync()}/login?error=rate_limited`);
    }
    if (e instanceof Error && e.message === 'github_disabled') {
      return NextResponse.redirect(`${await getAppUrlAsync()}/login?error=github_disabled`);
    }
    return error('GitHub sign-in failed to start', 500);
  }
}
