/**
 * Pure linking rules for Google Sign-In (testable without DB).
 */
export type GoogleLinkPlan =
  | { action: 'sign_in'; userId: string }
  | { action: 'link'; userId: string }
  | { action: 'create' };

export function planGoogleAccountLink(
  oauthUserId: string | undefined,
  emailUserId: string | undefined,
): GoogleLinkPlan {
  if (oauthUserId) {
    return { action: 'sign_in', userId: oauthUserId };
  }
  if (emailUserId) {
    return { action: 'link', userId: emailUserId };
  }
  return { action: 'create' };
}
