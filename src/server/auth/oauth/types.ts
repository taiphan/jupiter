export type OAuthProviderId = 'google' | 'microsoft' | 'github';

export type OAuthProfile = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  workspaceDomain?: string;
};
