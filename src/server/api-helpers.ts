import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb, isDbConfigured } from '@/server/db/client';
import { getCurrentUser } from '@/server/auth/session';
import { authenticateBearerToken } from '@/server/auth/api-tokens';
import { hasPermission, type Permission } from '@/lib/permissions';
import type { DbUser } from '@/server/db/schema';

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 503 when the backend isn't provisioned yet. */
export function requireDb() {
  if (!isDbConfigured()) {
    return error(
      'Backend not configured. Set DATABASE_URL or POSTGRES_URL to enable the API.',
      503,
    );
  }
  return null;
}

/** Returns the authenticated user (session cookie or Bearer PAT) or a 401 response. */
export async function requireUser(): Promise<DbUser | NextResponse> {
  const user = await getCurrentUser();
  if (user) return user;

  const hdrs = await headers();
  const bearerUser = await authenticateBearerToken(hdrs.get('authorization'));
  if (bearerUser) return bearerUser;

  return error('Not authenticated', 401);
}

export function requirePermission(user: DbUser, permission: Permission): NextResponse | null {
  if (!hasPermission(user.role, permission)) {
    return error('Forbidden', 403);
  }
  return null;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export { getDb };
