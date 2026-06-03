import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Lazily-initialized Drizzle client. The backend is opt-in: it only connects
 * when DATABASE_URL is present. Importing this module never throws — call
 * getDb() inside route handlers and handle the null case.
 */

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!isDbConfigured()) return null;
  if (!dbInstance) {
    client = postgres(process.env.DATABASE_URL!, {
      max: 5,
      prepare: false, // friendlier to serverless poolers (PgBouncer/Neon)
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export { schema };
