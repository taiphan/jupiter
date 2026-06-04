export type OAuthLinkPlan =
  | { action: 'sign_in'; userId: string }
  | { action: 'link'; userId: string }
  | { action: 'create' };

export function planOAuthAccountLink(
  oauthUserId: string | undefined,
  emailUserId: string | undefined,
): OAuthLinkPlan {
  if (oauthUserId) return { action: 'sign_in', userId: oauthUserId };
  if (emailUserId) return { action: 'link', userId: emailUserId };
  return { action: 'create' };
}
