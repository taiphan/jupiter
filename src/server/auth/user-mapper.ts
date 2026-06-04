import type { DbUser } from '@/server/db/schema';

export type PublicUser = Omit<DbUser, 'passwordHash'> & {
  emailVerified: boolean;
};

export function toPublicUser(user: DbUser): PublicUser {
  const { passwordHash: _ph, ...rest } = user;
  void _ph;
  return {
    ...rest,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export function isEmailVerified(user: DbUser): boolean {
  return Boolean(user.emailVerifiedAt);
}
