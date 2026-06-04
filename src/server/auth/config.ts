export function getAppUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3100').replace(/\/$/, '');
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.DATABASE_URL;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET or DATABASE_URL must be set in production');
  }
  return secret ?? 'jupiter-dev-auth-secret';
}

export function isGoogleAuthEnabled(): boolean {
  return (
    process.env.AUTH_GOOGLE_ENABLED === 'true' &&
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET)
  );
}

export function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}
