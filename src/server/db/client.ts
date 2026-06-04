import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { resolveDatabaseUrl } from '@/server/env';
import * as schema from './schema';

/**
 * Lazily-initialized Drizzle client. The backend is opt-in: it only connects
 * when a database URL is present (DATABASE_URL or Vercel POSTGRES_URL).
 * Importing this module never throws — call getDb() and handle the null case.
 */

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function getDb() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return null;
  if (!dbInstance) {
    client = postgres(databaseUrl, {
      max: 5,
      prepare: false, // friendlier to serverless poolers (PgBouncer/Neon)
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export { schema };
