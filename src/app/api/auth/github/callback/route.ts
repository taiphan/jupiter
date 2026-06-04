import { NextResponse } from 'next/server';
import { completeGitHubCallback } from '@/server/auth/oauth/github';
import { isGitHubAuthEnabled, getAppUrlAsync } from '@/server/auth/config';
import { oauthCallbackErrorParam } from '@/server/auth/oauth/callback-errors';

export async function GET(request: Request) {
  const appUrl = await getAppUrlAsync();
  if (!(await isGitHubAuthEnabled())) {
    return NextResponse.redirect(`${appUrl}/login?error=github_disabled`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${appUrl}/login?error=github_auth_failed`);
  }

  const result = await completeGitHubCallback(request, code, state);
  if (!result.ok) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${oauthCallbackErrorParam('github', result.reason)}`,
    );
  }

  return NextResponse.redirect(`${appUrl}${result.redirectTo}`);
}
